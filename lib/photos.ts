import { mediaId, origUrl } from './media-url';
import type { Photo, Tweet } from './tweets';

export interface PostPhoto extends Photo {
  source: Tweet | null;
  number: number;
}

export function collectPhotos(
  tweets: (Tweet | null)[],
  domUrls: string[],
): PostPhoto[] {
  const photos: PostPhoto[] = [];
  const seen = new Set<string>();
  const add = (photo: Photo, source: Tweet | null, number: number) => {
    const id = mediaId(photo.url);
    if (id && !seen.has(id)) {
      seen.add(id);
      photos.push({ ...photo, url: origUrl(photo.url), source, number });
    }
  };
  for (const tweet of tweets) {
    for (const [i, photo] of (tweet?.photos ?? []).entries()) {
      add(photo, tweet, i + 1);
    }
  }
  for (const url of domUrls) {
    add({ url, width: 0, height: 0, altText: null }, null, photos.length + 1);
  }
  return photos;
}

export function photoOwner(
  photos: PostPhoto[],
  fallback: Tweet | null,
): Tweet | null {
  return photos.find((photo) => photo.source)?.source ?? fallback;
}
