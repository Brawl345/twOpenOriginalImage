import buttonCss from './style.css?inline';
import {
  type Adapter,
  detectAdapter,
  photoImages,
  photoLink,
  statusId,
} from '../../lib/adapters';
import { isHookMessage } from '../../lib/graphql-hook';
import { t } from '../../lib/i18n';
import { findValidImageUrl, mediaId, tabUrl } from '../../lib/media-url';
import { sendMessage } from '../../lib/messages';
import {
  DEFAULT_OPTIONS,
  loadOptions,
  type Options,
  onOptionsChanged,
} from '../../lib/options';
import { collectPhotos } from '../../lib/photos';
import { type Tweet, TweetStore } from '../../lib/tweets';
import { showOverlay } from './overlay';

const BUTTON_CLASS = 'xvoi-button';
const MEDIA_PAGE_RE = /^\/[^/]+\/media\/?$/;

interface Modifiers {
  altKey: boolean;
  ctrlKey: boolean;
}

interface Focus {
  mediaId?: string | null;
  photoNumber?: number;
}

export default defineContentScript({
  matches: ['https://x.com/*'],
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  main(ctx) {
    const style = document.createElement('style');
    style.textContent = buttonCss;
    document.documentElement.append(style);

    const store = new TweetStore();
    let options: Options = { ...DEFAULT_OPTIONS };
    let hoveredPost: HTMLElement | null = null;
    let scanQueued = false;

    window.addEventListener('message', (event) => {
      if (event.source !== window || !isHookMessage(event.data)) {
        return;
      }
      try {
        store.addResponse(JSON.parse(event.data.body));
      } catch {}
    });

    const isDetailPage = () => statusId(location.pathname) !== null;

    const enabledHere = () => {
      if (!options.OPERATION) {
        return false;
      }
      if (isDetailPage()) {
        return options.SHOW_IN_DETAIL_PAGE;
      }
      if (MEDIA_PAGE_RE.test(location.pathname)) {
        return options.SHOW_IN_MEDIA_PAGE;
      }
      if (
        location.pathname === '/search' &&
        new URLSearchParams(location.search).get('f') === 'media'
      ) {
        return options.SHOW_IN_SEARCH_MEDIA;
      }
      return options.SHOW_IN_TIMELINE;
    };

    const outermostArticle = (element: Element | null): HTMLElement | null => {
      let article = element?.closest<HTMLElement>('article') ?? null;
      while (article?.parentElement) {
        const outer = article.parentElement.closest<HTMLElement>('article');
        if (!outer) {
          break;
        }
        article = outer;
      }
      return article;
    };

    const fetchTweet = async (id: string): Promise<Tweet | null> => {
      const known = store.get(id);
      if (known) {
        return known;
      }
      try {
        store.addResponse(await sendMessage({ type: 'fetchTweet', id }));
      } catch (error) {
        console.warn('[X View Original Images] guest lookup failed', error);
      }
      return store.get(id);
    };

    const openPhotos = async (
      tweetId: string | null,
      post: HTMLElement | null,
      modifiers: Modifiers,
      focus: Focus,
    ) => {
      const tweet = tweetId ? await fetchTweet(tweetId) : null;
      const quoted = tweet?.quotedId ? store.get(tweet.quotedId) : null;
      const domUrls = post ? photoImages(post).map((img) => img.src) : [];
      const photos = collectPhotos([tweet, quoted], domUrls);
      if (photos.length === 0) {
        return;
      }
      let index = -1;
      if (focus.mediaId) {
        index = photos.findIndex(
          (photo) => mediaId(photo.url) === focus.mediaId,
        );
      } else if (focus.photoNumber) {
        index = focus.photoNumber - 1;
      }
      if (options.DISPLAY_ALL_IN_ONE_PAGE !== modifiers.altKey) {
        await showOverlay(ctx, {
          photos,
          start: Math.max(index, 0),
          tweet,
          options,
        });
        return;
      }
      const focused = photos[index];
      const targets = focused ? [focused] : photos;
      await sendMessage({
        type: 'openTabs',
        urls: targets.map((photo) => tabUrl(photo.url)),
        active: !modifiers.ctrlKey,
      });
    };

    const openFromButton = async (
      button: HTMLButtonElement,
      adapter: Adapter,
      modifiers: Modifiers,
    ) => {
      button.setAttribute('aria-busy', 'true');
      try {
        if (button.dataset.kind === 'viewer') {
          const viewer = adapter.mediaViewer(document);
          if (viewer) {
            await openPhotos(viewer.tweetId, null, modifiers, {
              photoNumber: viewer.photoNumber,
            });
          }
          return;
        }
        const post = outermostArticle(button);
        if (post) {
          await openPhotos(adapter.tweetId(post), post, modifiers, {});
        }
      } finally {
        button.removeAttribute('aria-busy');
      }
    };

    const buttonTitle = () => {
      const alt = /Mac/.test(navigator.platform) ? 'Option' : 'Alt';
      const [click, altClick] = options.DISPLAY_ALL_IN_ONE_PAGE
        ? [
            'DISPLAY_ALL_IN_ONE_PAGE_DESCRIPTION',
            'DISPLAY_ONE_PER_PAGE_DESCRIPTION',
          ]
        : [
            'DISPLAY_ONE_PER_PAGE_DESCRIPTION',
            'DISPLAY_ALL_IN_ONE_PAGE_DESCRIPTION',
          ];
      return `[Click]: ${t(click)} / ${alt}+[Click]: ${t(altClick)}`;
    };

    const createButton = (kind: 'post' | 'viewer') => {
      const container = document.createElement('div');
      container.className = BUTTON_CLASS;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.kind = kind;
      button.title = buttonTitle();
      button.textContent = t('BUTTON_TEXT');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openFromButton(button, detectAdapter(document), event).catch(
          console.error,
        );
      });
      container.append(button);
      return container;
    };

    const ensureButton = (bar: HTMLElement | null, kind: 'post' | 'viewer') => {
      if (bar && !bar.querySelector(`:scope > .${BUTTON_CLASS}`)) {
        bar.append(createButton(kind));
      }
    };

    const removeButtons = () => {
      for (const button of document.querySelectorAll(`.${BUTTON_CLASS}`)) {
        button.remove();
      }
    };

    const swapImages = (post: HTMLElement) => {
      for (const img of photoImages(post)) {
        const state = img.dataset.xvoiSwap;
        if (state === 'pending' || state === img.src) {
          continue;
        }
        img.dataset.xvoiSwap = 'pending';
        findValidImageUrl(img.src).then((url) => {
          img.removeAttribute('srcset');
          img.removeAttribute('sizes');
          img.src = url;
          img.dataset.xvoiSwap = img.src;
          for (const sibling of img.parentElement?.children ?? []) {
            if (
              sibling instanceof HTMLElement &&
              sibling.style.backgroundImage.includes('/media/')
            ) {
              sibling.style.backgroundImage = `url("${url}")`;
            }
          }
        });
      }
    };

    const scan = () => {
      scanQueued = false;
      const adapter = detectAdapter(document);
      const enabled = enabledHere();
      const showButtons = enabled && options.DISPLAY_ORIGINAL_BUTTONS;
      if (!showButtons) {
        removeButtons();
      }
      if (!enabled) {
        return;
      }
      for (const post of adapter.findPosts(document)) {
        if (photoImages(post).length === 0) {
          continue;
        }
        if (showButtons) {
          ensureButton(adapter.actionBar(post), 'post');
        }
        if (options.SWAP_IMAGE_URL) {
          swapImages(post);
        }
      }
      if (showButtons) {
        ensureButton(adapter.mediaViewer(document)?.bar ?? null, 'viewer');
      }
    };

    const queueScan = () => {
      if (!scanQueued) {
        scanQueued = true;
        requestAnimationFrame(scan);
      }
    };

    const refresh = () => {
      removeButtons();
      queueScan();
    };

    loadOptions().then((loaded) => {
      options = loaded;
      refresh();
    }, console.error);
    onOptionsChanged((changed) => {
      options = changed;
      refresh();
    });

    const isEditable = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]',
      );

    document.addEventListener(
      'click',
      (event) => {
        if (
          event.button !== 0 ||
          event.ctrlKey ||
          event.metaKey ||
          (event.shiftKey && event.altKey) ||
          !enabledHere() ||
          !options.OVERRIDE_CLICK_EVENT ||
          !(event.target instanceof Element) ||
          event.target.closest(`.${BUTTON_CLASS}`)
        ) {
          return;
        }
        const link = photoLink(event.target);
        const img = link?.querySelector<HTMLImageElement>(
          'img[src*="pbs.twimg.com/media/"]',
        );
        if (!link || !img) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        const post = outermostArticle(link);
        const adapter = detectAdapter(document);
        const tweetId =
          (post && adapter.tweetId(post)) ??
          statusId(link.getAttribute('href'));
        openPhotos(tweetId, post, event, { mediaId: mediaId(img.src) }).catch(
          console.error,
        );
      },
      true,
    );

    document.addEventListener(
      'mouseover',
      (event) => {
        if (event.target instanceof Element) {
          hoveredPost = outermostArticle(event.target) ?? hoveredPost;
        }
      },
      { passive: true },
    );

    const keyTarget = (adapter: Adapter) => {
      const focused = outermostArticle(
        document.activeElement instanceof Element
          ? document.activeElement
          : null,
      );
      if (focused) {
        return focused;
      }
      if (hoveredPost?.isConnected) {
        return hoveredPost;
      }
      const id = statusId(location.pathname);
      return id
        ? (adapter
            .findPosts(document)
            .find((post) => adapter.tweetId(post) === id) ?? null)
        : null;
    };

    document.addEventListener(
      'keydown',
      (event) => {
        if (
          event.code !== 'KeyV' ||
          event.ctrlKey ||
          event.metaKey ||
          isEditable(event.target) ||
          !enabledHere()
        ) {
          return;
        }
        const adapter = detectAdapter(document);
        const viewer = adapter.mediaViewer(document);
        const post = viewer ? null : keyTarget(adapter);
        if (!viewer && (!post || photoImages(post).length === 0)) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        const opening = viewer
          ? openPhotos(viewer.tweetId, null, event, {
              photoNumber: viewer.photoNumber,
            })
          : openPhotos(post && adapter.tweetId(post), post, event, {});
        opening.catch(console.error);
      },
      true,
    );

    const observe = () => {
      new MutationObserver(queueScan).observe(document.body, {
        childList: true,
        subtree: true,
      });
      queueScan();
    };
    if (document.body) {
      observe();
    } else {
      document.addEventListener('DOMContentLoaded', observe, { once: true });
    }
  },
});
