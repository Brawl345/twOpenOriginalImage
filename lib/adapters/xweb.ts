import { type Adapter, statusId, viewerBar, viewerLocation } from './common';

const QUOTE = '[data-slot="embedded-tweet-frame"]';

export const xweb: Adapter = {
  findPosts(root) {
    return Array.from(root.querySelectorAll<HTMLElement>('article')).filter(
      (article) => !article.parentElement?.closest(QUOTE),
    );
  },

  tweetId(post) {
    const wrapper = post.closest('[data-href]');
    if (wrapper) {
      return statusId(wrapper.getAttribute('data-href'));
    }
    return statusId(post.ownerDocument.location.pathname);
  },

  actionBar(post) {
    return (
      Array.from(post.querySelectorAll<HTMLElement>('[role="group"]')).find(
        (group) => !group.closest(QUOTE),
      ) ?? null
    );
  },

  mediaViewer(doc) {
    const location = viewerLocation(doc.location.pathname);
    const bar = viewerBar(
      doc.querySelector('[role="dialog"][data-slot="xds-modal-surface"]'),
    );
    return location && bar ? { ...location, bar } : null;
  },
};
