import { createApp } from 'vue';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { downloadFilename } from '../../lib/media-url';
import { sendMessage } from '../../lib/messages';
import type { Options } from '../../lib/options';
import {
  loadOverlayPrefs,
  type OverlayPrefs,
  saveOverlayPrefs,
} from '../../lib/overlay-prefs';
import { type PostPhoto, photoOwner } from '../../lib/photos';
import type { Tweet } from '../../lib/tweets';
import { buildZip, fetchImage, saveZip, zipBaseName } from '../../lib/zip';
import Overlay from './Overlay.vue';

interface OverlayRequest {
  photos: PostPhoto[];
  start: number;
  tweet: Tweet | null;
  options: Options;
}

let open = false;

function luminance(color: string): number | null {
  const [r, g, b, a = 1] = color.match(/[\d.]+/g)?.map(Number) ?? [];
  if (r === undefined || g === undefined || b === undefined || a === 0) {
    return null;
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function pageIsDark(): boolean {
  for (const element of [document.body, document.documentElement]) {
    const value =
      element && luminance(getComputedStyle(element).backgroundColor);
    if (value !== null && value !== undefined) {
      return value < 0.5;
    }
  }
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

async function zip(tweet: Tweet, photos: PostPhoto[], urls: string[]) {
  const data = await Promise.all(urls.map(fetchImage));
  const bytes = buildZip(
    tweet,
    urls.map((url, i) => ({
      url,
      altText: photos[i]?.altText ?? null,
      data: data[i] ?? null,
      source: photos[i]?.source ?? null,
      number: photos[i]?.number ?? i + 1,
    })),
  );
  await saveZip(`${zipBaseName(tweet)}.zip`, bytes);
}

export async function showOverlay(
  ctx: ContentScriptContext,
  { photos, start, tweet: post, options }: OverlayRequest,
): Promise<void> {
  if (open || photos.length === 0) {
    return;
  }
  open = true;
  const prefs = await loadOverlayPrefs().catch(() => null);
  const html = document.documentElement;
  const savedOverflow = html.style.overflow;
  const previousFocus = document.activeElement;
  const tweet = photoOwner(photos, post);
  const filename = (index: number, url: string) => {
    const photo = photos[index];
    const source = photo?.source ?? tweet;
    return downloadFilename(url, {
      linkUrl: source
        ? `${source.url}/photo/${photo?.number ?? index + 1}`
        : undefined,
      sameAsZip: options.SAME_FILENAME_AS_IN_ZIP,
      suppressSuffix: options.SUPPRESS_FILENAME_SUFFIX,
    });
  };

  const ui = await createShadowRootUi(ctx, {
    name: 'xvoi-overlay',
    position: 'modal',
    anchor: 'body',
    isolateEvents: true,
    onMount(container) {
      // WXT's `:host { all: initial !important }` overrides its own `zIndex` option.
      container.style.zIndex = '2147483647';
      const app = createApp(Overlay, {
        photos,
        start,
        dark: pageIsDark(),
        hideDownloadButton: options.HIDE_DOWNLOAD_BUTTON_AUTOMATICALLY,
        initialSize: prefs?.size ?? 'fit-window',
        initialBackground: prefs?.background ?? 'black',
        filename,
        postUrl: (index: number) =>
          (photos[index]?.source ?? tweet)?.url ?? null,
        onClose: () => ui.remove(),
        onDownload: (index: number, url: string) => {
          sendMessage({
            type: 'download',
            url,
            filename: filename(index, url),
          }).catch(console.error);
        },
        onZip: tweet ? (urls: string[]) => zip(tweet, photos, urls) : null,
        onPrefs: (prefs: OverlayPrefs) => {
          saveOverlayPrefs(prefs).catch(console.error);
        },
      });
      app.mount(container);
      return app;
    },
    onRemove(app) {
      app?.unmount();
      html.style.overflow = savedOverflow;
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus({ preventScroll: true });
      }
      open = false;
    },
  });
  html.style.overflow = 'hidden';
  ui.mount();
}
