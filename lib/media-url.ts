const IMAGE_FORMATS = ['jpg', 'png', 'gif', 'webp'] as const;

export interface MediaImage {
  id: string;
  format: string;
  name: string | null;
}

const MEDIA_PATH_RE = /^\/media\/([^/.:]+)(?:\.(\w+))?(?::(\w+))?$/;
const PHOTO_LINK_RE =
  /^https?:\/\/(?:mobile\.)?(?:x|twitter)\.com\/([^/]+)\/status(?:es)?\/(\d+)\/photo\/(\d+)/;

export function parseImageUrl(url: string): MediaImage | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== 'pbs.twimg.com') {
    return null;
  }
  const match = parsed.pathname.match(MEDIA_PATH_RE);
  const id = match?.[1];
  const format = match?.[2] ?? parsed.searchParams.get('format');
  if (!id || !format) {
    return null;
  }
  return { id, format, name: match?.[3] ?? parsed.searchParams.get('name') };
}

export function formatImageUrl({ id, format, name }: MediaImage): string {
  return `https://pbs.twimg.com/media/${id}?format=${format}${name ? `&name=${name}` : ''}`;
}

export function origUrl(url: string): string {
  const image = parseImageUrl(url);
  return image ? formatImageUrl({ ...image, name: 'orig' }) : url;
}

export function origCapableUrl(url: string): string {
  const image = parseImageUrl(url);
  if (!image) {
    return url;
  }
  return formatImageUrl({
    ...image,
    format: image.format === 'webp' ? 'jpg' : image.format,
    name: 'orig',
  });
}

export function mediaId(url: string): string | null {
  return parseImageUrl(url)?.id ?? null;
}

export function tabUrl(url: string): string {
  const image = parseImageUrl(url);
  if (!image) {
    return url;
  }
  return formatImageUrl({
    ...image,
    name: image.format === 'webp' ? '4096x4096' : 'orig',
  });
}

function imageLoads(url: string): Promise<boolean> {
  if (typeof Image === 'undefined') {
    return fetch(url, { method: 'HEAD' }).then(
      (response) => response.ok,
      () => false,
    );
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

const validUrlCache = new Map<string, Promise<string>>();

export function findValidImageUrl(
  url: string,
  isValid: (url: string) => Promise<boolean> = imageLoads,
): Promise<string> {
  const image = parseImageUrl(origCapableUrl(url));
  if (!image) {
    return Promise.resolve(url);
  }
  const first = formatImageUrl(image);
  let result = validUrlCache.get(first);
  if (!result) {
    result = (async () => {
      const candidates = [
        first,
        ...IMAGE_FORMATS.filter((format) => format !== image.format).map(
          (format) => formatImageUrl({ ...image, format }),
        ),
      ];
      for (const candidate of candidates) {
        if (await isValid(candidate)) {
          return candidate;
        }
      }
      validUrlCache.delete(first);
      return first;
    })();
    validUrlCache.set(first, result);
  }
  return result;
}

export function imageFilename(
  url: string,
  { suppressSuffix }: { suppressSuffix: boolean },
): string | null {
  const image = parseImageUrl(url);
  if (!image) {
    return null;
  }
  return suppressSuffix || !image.name
    ? `${image.id}.${image.format}`
    : `${image.id}-${image.name}.${image.format}`;
}

export function zipImageFilename(
  screenName: string,
  tweetId: string,
  number: number,
  format: string,
): string {
  return `${screenName}-${tweetId}-img${number}.${format}`;
}

export function downloadFilename(
  url: string,
  options: {
    linkUrl?: string;
    pageUrl?: string;
    sameAsZip: boolean;
    suppressSuffix: boolean;
  },
): string | null {
  const image = parseImageUrl(url);
  if (!image) {
    return null;
  }
  const link = options.sameAsZip
    ? (options.linkUrl?.match(PHOTO_LINK_RE) ??
      options.pageUrl?.match(PHOTO_LINK_RE))
    : null;
  if (link?.[1] && link[2] && link[3]) {
    return zipImageFilename(link[1], link[2], Number(link[3]), image.format);
  }
  return imageFilename(url, options);
}
