import { defineConfig } from 'wxt';
import pkg from './package.json' with { type: 'json' };

const { release, repository } = pkg as {
  release: { channel: 'github' | 'store' | 'local' };
  repository?: { url: string };
};
const updateBase =
  release.channel === 'github' && repository
    ? `${repository.url.replace('https://github.com/', 'https://raw.githubusercontent.com/')}/HEAD`
    : undefined;

const matches = [
  '*://x.com/*',
  '*://pbs.twimg.com/media/*',
  '*://tweetdeck.x.com/*',
  '*://mobile.x.com/*',
];

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  outDirTemplate: '{{browser}}{{modeSuffix}}',
  manifestVersion: 3,
  webExt: {
    disabled: process.env.NO_OPEN === '1',
  },
  manifest: ({ browser, mode }) => {
    const updates = updateBase !== undefined && mode === 'production';
    return {
      name: '__MSG_ext_title__',
      short_name: '__MSG_ext_short_name__',
      description: '__MSG_ext_description__',
      author: 'furyu',
      default_locale: 'en',
      icons: {
        16: 'img/icon_16.png',
        48: 'img/icon_48.png',
        96: 'img/icon_96.png',
        128: 'img/icon_128.png',
      },
      content_scripts: [
        {
          matches,
          js: [
            'js/jszip.min.js',
            'js/FileSaver.min.js',
            'js/inject_script.js',
            'js/tweet_api.js',
            'js/init.js',
          ],
          run_at: 'document_start',
          all_frames: true,
        },
        {
          matches,
          js: ['js/twOpenOriginalImage.user.js'],
          run_at: 'document_end',
          all_frames: true,
        },
      ],
      permissions: ['contextMenus', 'downloads', 'storage'],
      host_permissions: ['*://*.twimg.com/*', '*://*.x.com/*'],
      options_ui: {
        page: 'html/options.html',
        ...(browser === 'chrome' ? { open_in_tab: false } : {}),
      },
      action: {
        default_icon: 'img/icon_48.png',
        default_title: '__MSG_ext_title__',
        default_popup: 'html/options.html',
      },
      web_accessible_resources: [
        { matches: ['*://*.x.com/*'], resources: ['js/*.js'] },
      ],
      ...(updates && browser === 'chrome'
        ? { update_url: `${updateBase}/updates.xml` }
        : {}),
      browser_specific_settings: {
        gecko: {
          id: 'twopenoriginalimage@brawl345.github.com',
          strict_min_version: '140.0',
          data_collection_permissions: {
            required: ['none'],
          },
          ...(updates && browser === 'firefox'
            ? { update_url: `${updateBase}/updates.json` }
            : {}),
        },
        gecko_android: {
          strict_min_version: '142.0',
        },
      },
    };
  },
});
