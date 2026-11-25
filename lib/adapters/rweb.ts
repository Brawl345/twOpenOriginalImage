import { type Adapter, statusId, viewerBar, viewerLocation } from './common';

const QUOTE = 'div[role="link"]';

export const rweb: Adapter = {
  findPosts(root) {
    return Array.from(
      root.querySelectorAll<HTMLElement>('article[data-testid="tweet"]'),
    );
  },

  tweetId(post) {
    for (const time of post.querySelectorAll('a[href*="/status/"] time')) {
      if (!time.closest(QUOTE)) {
        const id = statusId(time.closest('a')?.getAttribute('href'));
        if (id) {
          return id;
        }
      }
    }
    for (const link of post.querySelectorAll('a[href*="/photo/"]')) {
      if (!link.closest(QUOTE)) {
        return statusId(link.getAttribute('href'));
      }
    }
    return null;
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
      doc.querySelector('[aria-labelledby="modal-header"]'),
    );
    return location && bar ? { ...location, bar } : null;
  },
};
