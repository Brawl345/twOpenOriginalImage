import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { collectPhotos, photoOwner } from '../lib/photos';
import { parseTweets, type Tweet } from '../lib/tweets';
import { buildZip, tweetInfoText, zipBaseName } from '../lib/zip';

const tweets = parseTweets(
  JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, 'fixtures', 'xweb-tweet-detail-quote.json'),
      'utf8',
    ),
  ),
);
const byId = (id: string): Tweet => {
  const tweet = tweets.find((t) => t.id === id);
  if (!tweet) {
    throw new Error(`tweet ${id} not parsed`);
  }
  return tweet;
};
const outer = byId('1695944187999375708');
const quoted = byId('1695914219370164702');
const photos = collectPhotos([outer, quoted], []).map((photo, i) => ({
  ...photo,
  url: i === 1 ? photo.url.replace('format=jpg', 'format=png') : photo.url,
  altText: i === 0 ? 'a mirror' : null,
}));
const format = (ms: number) => new Date(ms).toISOString();
const rule = '-'.repeat(80);

describe('tweetInfoText', () => {
  it('writes URL, author, date, text with quote and media with alt texts', () => {
    expect(tweetInfoText(outer, photos, format)).toBe(
      [
        'https://x.com/NASA/status/1695944187999375708',
        rule,
        'NASA',
        '@NASA',
        '2023-08-27T23:39:38.000Z',
        rule,
        outer.text,
        '',
        'https://x.com/NASAUniverse/status/1695914219370164702',
        rule,
        'https://pbs.twimg.com/media/F4kzhzVWEAQD2Nq?format=jpg&name=orig',
        '[Alt]',
        'a mirror',
        '',
        'https://pbs.twimg.com/media/F4kY_YoWcAENIk5?format=png&name=orig',
        '',
      ].join('\n'),
    );
  });
});

describe('buildZip', () => {
  const files = unzipSync(
    buildZip(
      outer,
      photos.map((photo, i) => ({
        ...photo,
        data: new Uint8Array([i, 1, 2]),
      })),
      format,
    ),
  );

  it('names each image after the post it belongs to', () => {
    const base = zipBaseName(outer);
    expect(base).toBe('NASA-1695944187999375708');
    expect(Object.keys(files).sort()).toEqual([
      `${base}-img1.jpg`,
      `${base}.txt`,
      `${base}.url`,
      'NASAUniverse-1695914219370164702-img1.png',
    ]);
    expect([
      ...(files['NASAUniverse-1695914219370164702-img1.png'] ?? []),
    ]).toEqual([1, 1, 2]);
  });

  it('takes the quoted post as owner when only it has photos', () => {
    const quotePhotos = collectPhotos([{ ...outer, photos: [] }, quoted], []);
    const owner = photoOwner(quotePhotos, outer);
    expect(owner?.screenName).toBe('NASAUniverse');
    const names = Object.keys(
      unzipSync(
        buildZip(
          owner ?? outer,
          quotePhotos.map((photo) => ({ ...photo, data: new Uint8Array([1]) })),
        ),
      ),
    );
    expect(names.sort()).toEqual([
      'NASAUniverse-1695914219370164702-img1.jpg',
      'NASAUniverse-1695914219370164702.txt',
      'NASAUniverse-1695914219370164702.url',
    ]);
  });

  it('writes an internet shortcut and the info text', () => {
    const base = zipBaseName(outer);
    expect(strFromU8(files[`${base}.url`] ?? new Uint8Array())).toBe(
      '[InternetShortcut]\nURL=https://x.com/NASA/status/1695944187999375708\n',
    );
    expect(strFromU8(files[`${base}.txt`] ?? new Uint8Array())).toBe(
      tweetInfoText(outer, photos, format),
    );
  });

  it('skips images that failed to load', () => {
    const names = Object.keys(
      unzipSync(
        buildZip(
          outer,
          photos.map((photo, i) => ({
            ...photo,
            data: i === 0 ? null : new Uint8Array([1]),
          })),
        ),
      ),
    );
    expect(names).not.toContain('NASA-1695944187999375708-img1.jpg');
    expect(names).toContain('NASAUniverse-1695914219370164702-img1.png');
  });
});
