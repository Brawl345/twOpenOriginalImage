import { strToU8, type Zippable, zipSync } from 'fflate';
import { parseImageUrl, zipImageFilename } from './media-url';
import type { Tweet } from './tweets';

interface ZipImage {
  url: string;
  altText: string | null;
  data: Uint8Array | null;
  source: Pick<Tweet, 'screenName' | 'id'> | null;
  number: number;
}

const SEPARATOR = `\n${'-'.repeat(80)}\n`;

export function zipBaseName(tweet: Pick<Tweet, 'screenName' | 'id'>): string {
  return `${tweet.screenName}-${tweet.id}`;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString().replaceAll(/\p{Cf}/gu, '');
}

export function tweetInfoText(
  tweet: Tweet,
  images: Pick<ZipImage, 'url' | 'altText'>[],
  format: (ms: number) => string = formatDate,
): string {
  const media = images
    .map(({ url, altText }) => (altText ? `${url}\n[Alt]\n${altText}\n` : url))
    .join('\n');
  return `${[
    tweet.url,
    `${tweet.name}\n@${tweet.screenName}\n${format(tweet.createdAt)}`,
    tweet.text + (tweet.quotedUrl ? `\n\n${tweet.quotedUrl}` : ''),
    media,
  ].join(SEPARATOR)}\n`;
}

export function buildZip(
  tweet: Tweet,
  images: ZipImage[],
  format: (ms: number) => string = formatDate,
): Uint8Array {
  const mtime = new Date(tweet.createdAt);
  const base = zipBaseName(tweet);
  const files: Zippable = {
    [`${base}.url`]: [
      strToU8(`[InternetShortcut]\nURL=${tweet.url}\n`),
      { mtime },
    ],
    [`${base}.txt`]: [strToU8(tweetInfoText(tweet, images, format)), { mtime }],
  };
  for (const image of images) {
    const imageFormat = parseImageUrl(image.url)?.format;
    const { screenName, id } = image.source ?? tweet;
    if (image.data && imageFormat) {
      files[zipImageFilename(screenName, id, image.number, imageFormat)] = [
        image.data,
        { mtime },
      ];
    }
  }
  return zipSync(files, { level: 0 });
}

export async function fetchImage(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

function clickDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.addEventListener('click', (event) => event.stopPropagation());
  document.documentElement.append(link);
  link.click();
  link.remove();
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function saveZip(
  filename: string,
  bytes: Uint8Array,
): Promise<void> {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
    type: 'application/zip',
  });
  // Firefox flags ZIPs saved from blob URLs as unsafe downloads.
  if (import.meta.env.FIREFOX) {
    clickDownload(await dataUrl(blob), filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  clickDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
