import { browser, type Browser } from 'wxt/browser';
import { fetchTweetResult } from '../lib/guest-api';
import { t } from '../lib/i18n';
import { downloadFilename, findValidImageUrl } from '../lib/media-url';
import type { Message } from '../lib/messages';
import { loadOptions, onOptionsChanged, type Options } from '../lib/options';

const MENU_ID = 'download_image';
const MEDIA_PATTERN = '*://pbs.twimg.com/media/*';
const OBSOLETE_KEYS = [
  'TAB_SORTING',
  'ENABLED_ON_TWEETDECK',
  'OVERRIDE_GALLERY_FOR_TWEETDECK',
  'BUTTON_TEXT',
  'CONTEXT_MENU_INITIALIZED',
  'CONTEXT_MENU_IS_SUSPENDED',
  'CONTENT_TAB_INFOS',
];

function menuTitle(options: Options): string {
  const title = t('DOWNLOAD_ORIGINAL_IMAGE');
  return options.OPERATION ? title : `${title} [${t('UNDER_SUSPENSION')}]`;
}

async function showState(options: Options): Promise<void> {
  await browser.action.setIcon({
    path: options.OPERATION ? '/img/icon_48.png' : '/img/icon_48-gray.png',
  });
}

async function setupMenu(): Promise<void> {
  const options = await loadOptions();
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: MENU_ID,
    title: menuTitle(options),
    contexts: ['image'],
    targetUrlPatterns: [MEDIA_PATTERN],
  });
  await showState(options);
}

async function downloadImage(
  info: Browser.contextMenus.OnClickData,
): Promise<void> {
  const options = await loadOptions();
  if (!options.OPERATION || !info.srcUrl) {
    return;
  }
  const url = await findValidImageUrl(info.srcUrl);
  const filename = downloadFilename(url, {
    linkUrl: info.linkUrl,
    pageUrl: info.pageUrl,
    sameAsZip: options.SAME_FILENAME_AS_IN_ZIP,
    suppressSuffix: options.SUPPRESS_FILENAME_SUFFIX,
  });
  await browser.downloads.download({ url, filename: filename ?? undefined });
}

async function openTabs(
  urls: string[],
  active: boolean,
  tab: Browser.tabs.Tab | undefined,
): Promise<void> {
  const safe = urls.filter((url) => url.startsWith('https://pbs.twimg.com/'));
  for (const [i, url] of safe.entries()) {
    await browser.tabs.create({
      url,
      active: active && i === 0,
      windowId: tab?.windowId,
      index: tab ? tab.index + 1 + i : undefined,
      openerTabId: tab?.id,
    });
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'update') {
      browser.storage.local.remove(OBSOLETE_KEYS).catch(console.error);
    }
    setupMenu().catch(console.error);
  });
  browser.runtime.onStartup.addListener(() => {
    setupMenu().catch(console.error);
  });

  onOptionsChanged((options) => {
    browser.contextMenus
      .update(MENU_ID, { title: menuTitle(options) })
      .catch(console.error);
    showState(options).catch(console.error);
  });

  browser.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === MENU_ID) {
      downloadImage(info).catch(console.error);
    }
  });

  browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage().catch(console.error);
  });

  browser.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      switch (message?.type) {
        case 'fetchTweet':
          fetchTweetResult(
            message.id,
            browser.i18n.getUILanguage().split('-')[0],
          ).then(sendResponse, (error) => {
            console.warn('guest TweetResultByRestId failed', error);
            sendResponse(null);
          });
          return true;
        case 'download':
          if (message.url.startsWith('https://pbs.twimg.com/media/')) {
            browser.downloads
              .download({
                url: message.url,
                filename: message.filename ?? undefined,
              })
              .catch(console.error);
          }
          return false;
        case 'openTabs':
          openTabs(message.urls, message.active, sender.tab).then(
            () => sendResponse(null),
            (error) => {
              console.error(error);
              sendResponse(null);
            },
          );
          return true;
      }
      return false;
    },
  );
});
