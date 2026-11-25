import { describe, expect, it } from 'vitest';
import { tabUrl } from '../lib/media-url';
import { collectPhotos } from '../lib/photos';
import type { Tweet } from '../lib/tweets';

const tweet = (...ids: string[]): Tweet => ({
  id: '1',
  screenName: 'a',
  name: 'a',
  text: '',
  createdAt: 0,
  url: '',
  quotedId: null,
  quotedUrl: null,
  photos: ids.map((id) => ({
    url: `https://pbs.twimg.com/media/${id}.jpg`,
    width: 10,
    height: 20,
    altText: id,
  })),
});

describe('collectPhotos', () => {
  it('lists post and quote photos as orig URLs, then unknown DOM photos', () => {
    const photos = collectPhotos(
      [tweet('A', 'B'), tweet('C')],
      [
        'https://pbs.twimg.com/media/B?format=jpg&name=small',
        'https://pbs.twimg.com/media/D?format=png&name=small',
      ],
    );
    expect(photos.map((p) => p.url)).toEqual([
      'https://pbs.twimg.com/media/A?format=jpg&name=orig',
      'https://pbs.twimg.com/media/B?format=jpg&name=orig',
      'https://pbs.twimg.com/media/C?format=jpg&name=orig',
      'https://pbs.twimg.com/media/D?format=png&name=orig',
    ]);
    expect(photos[0]).toMatchObject({ width: 10, height: 20, altText: 'A' });
    expect(photos[3]).toMatchObject({ width: 0, altText: null });
  });

  it('uses the DOM alone without data', () => {
    expect(
      collectPhotos([null], ['https://pbs.twimg.com/media/X.jpg']),
    ).toHaveLength(1);
  });
});

describe('tabUrl', () => {
  it('opens webp at 4096x4096 and others at orig', () => {
    expect(tabUrl('https://pbs.twimg.com/media/A?format=webp&name=orig')).toBe(
      'https://pbs.twimg.com/media/A?format=webp&name=4096x4096',
    );
    expect(tabUrl('https://pbs.twimg.com/media/A.png')).toBe(
      'https://pbs.twimg.com/media/A?format=png&name=orig',
    );
  });
});
