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

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
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
      author: 'furyu, Brawl345',
      default_locale: 'en',
      icons: {
        16: 'img/icon_16.png',
        48: 'img/icon_48.png',
        96: 'img/icon_96.png',
        128: 'img/icon_128.png',
      },
      permissions: ['contextMenus', 'downloads', 'storage'],
      host_permissions: [
        'https://x.com/*',
        'https://api.x.com/*',
        'https://pbs.twimg.com/*',
      ],
      action: {
        default_icon: 'img/icon_48.png',
        default_title: '__MSG_ext_title__',
      },
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
