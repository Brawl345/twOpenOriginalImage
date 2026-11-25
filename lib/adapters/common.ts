interface MediaViewer {
  bar: HTMLElement;
  tweetId: string;
  photoNumber: number;
}

export interface Adapter {
  findPosts(root: ParentNode): HTMLElement[];
  tweetId(post: HTMLElement): string | null;
  actionBar(post: HTMLElement): HTMLElement | null;
  mediaViewer(doc: Document): MediaViewer | null;
}

const STATUS_RE = /^(?:https:\/\/(?:x|twitter)\.com)?\/[^/]+\/status\/(\d+)/;
const VIEWER_RE = /^\/[^/]+\/status\/(\d+)\/photo\/(\d+)/;

export function statusId(href: string | null | undefined): string | null {
  return href?.match(STATUS_RE)?.[1] ?? null;
}

export function viewerLocation(
  pathname: string,
): { tweetId: string; photoNumber: number } | null {
  const match = pathname.match(VIEWER_RE);
  return match?.[1] && match[2]
    ? { tweetId: match[1], photoNumber: Number(match[2]) }
    : null;
}

export function photoImages(post: HTMLElement): HTMLImageElement[] {
  return Array.from(
    post.querySelectorAll<HTMLImageElement>(
      'a[href*="/photo/"] img[src*="pbs.twimg.com/media/"]',
    ),
  );
}

export function photoLink(img: Element): HTMLAnchorElement | null {
  return img.closest<HTMLAnchorElement>('a[href*="/photo/"]');
}

export function viewerBar(dialog: Element | null): HTMLElement | null {
  if (!dialog) {
    return null;
  }
  return (
    Array.from(dialog.querySelectorAll<HTMLElement>('[role="group"]')).find(
      (group) => !group.closest('article'),
    ) ?? null
  );
}
