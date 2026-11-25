import { t } from '../lib/i18n';
import {
  findValidImageUrl,
  formatImageUrl,
  imageFilename,
  type MediaImage,
  origUrl,
  parseImageUrl,
} from '../lib/media-url';
import { loadOptions, type Options } from '../lib/options';

const SIZES = ['thumb', 'small', '900x900', 'medium', 'large', 'orig'];

const STYLE = `
:host {
  all: initial;
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 2147483647;
  transition: opacity 0.4s;
}
:host(.hidden:not(:hover)) {
  opacity: 0;
}
nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #fffde7;
  border-bottom: 1px solid #c0c0c0;
  font: 14px/1.4 system-ui, sans-serif;
}
a, span {
  padding: 2px 8px;
  border-radius: 4px;
  color: #1d4ed8;
  background: #fff;
  font-weight: 600;
  text-decoration: none;
}
a:hover {
  background: #dbeafe;
}
span {
  color: #6b7280;
}
.download {
  margin-right: 8px;
  border: 2px solid #e1e8ed;
  color: #374151;
  font-weight: normal;
}
.download:hover {
  border-color: #dc2626;
}
`;

function showBar(image: MediaImage, options: Options): void {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  const nav = document.createElement('nav');

  const download = document.createElement('a');
  download.className = 'download';
  download.href = location.href;
  download.download =
    imageFilename(location.href, {
      suppressSuffix: options.SUPPRESS_FILENAME_SUFFIX,
    }) ?? '';
  download.textContent = t('DOWNLOAD');
  nav.append(download);

  for (const size of SIZES) {
    const link = document.createElement(size === image.name ? 'span' : 'a');
    link.textContent = size;
    if (link instanceof HTMLAnchorElement) {
      link.href = formatImageUrl({ ...image, name: size });
    }
    nav.append(link);
  }

  root.append(style, nav);
  document.body.prepend(host);

  if (options.HIDE_DOWNLOAD_BUTTON_AUTOMATICALLY) {
    setTimeout(() => host.classList.add('hidden'), 1500);
  }

  document.addEventListener('keydown', (event) => {
    if (
      event.code === 'KeyD' &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.metaKey
    ) {
      download.click();
    }
  });
}

export default defineContentScript({
  matches: ['https://pbs.twimg.com/media/*'],
  runAt: 'document_end',
  async main() {
    const options = await loadOptions();
    const image = parseImageUrl(location.href);
    if (!options.OPERATION || !image) {
      return;
    }

    if (!document.querySelector('img')) {
      const valid = await findValidImageUrl(location.href);
      if (valid !== location.href) {
        location.replace(valid);
      }
      return;
    }

    const fromSameImage =
      document.referrer !== '' &&
      origUrl(document.referrer) === origUrl(location.href);
    if (!fromSameImage && image.name !== 'orig') {
      location.replace(await findValidImageUrl(location.href));
      return;
    }

    showBar(image, options);
  },
});
