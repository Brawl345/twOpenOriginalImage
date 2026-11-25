import { describe, expect, it } from 'vitest';
import {
  downloadFilename,
  findValidImageUrl,
  imageFilename,
  origCapableUrl,
  origUrl,
  parseImageUrl,
  zipImageFilename,
} from '../lib/media-url';

describe('parseImageUrl', () => {
  it.each([
    [
      'https://pbs.twimg.com/media/F4kzh-zVWEAQD2N.jpg',
      { id: 'F4kzh-zVWEAQD2N', format: 'jpg', name: null },
    ],
    [
      'https://pbs.twimg.com/media/F4kzh-zVWEAQD2N.png:orig',
      { id: 'F4kzh-zVWEAQD2N', format: 'png', name: 'orig' },
    ],
    [
      'https://pbs.twimg.com/media/F4kY_YoWcAENIk5?format=webp&name=small',
      { id: 'F4kY_YoWcAENIk5', format: 'webp', name: 'small' },
    ],
    [
      'https://pbs.twimg.com/media/A.jpg?name=900x900',
      { id: 'A', format: 'jpg', name: '900x900' },
    ],
  ])('%s', (url, expected) => {
    expect(parseImageUrl(url)).toEqual(expected);
  });

  it.each([
    'https://pbs.twimg.com/media/A',
    'https://pbs.twimg.com/profile_images/1/a.jpg',
    'https://example.com/media/A.jpg',
    'A.jpg',
  ])('rejects %s', (url) => {
    expect(parseImageUrl(url)).toBeNull();
  });
});

describe('orig URLs', () => {
  it('sets name=orig and keeps the format', () => {
    expect(origUrl('https://pbs.twimg.com/media/A?format=png&name=small')).toBe(
      'https://pbs.twimg.com/media/A?format=png&name=orig',
    );
    expect(origUrl('https://pbs.twimg.com/media/A.webp')).toBe(
      'https://pbs.twimg.com/media/A?format=webp&name=orig',
    );
  });

  it('turns webp into jpg for orig', () => {
    expect(
      origCapableUrl('https://pbs.twimg.com/media/A?format=webp&name=small'),
    ).toBe('https://pbs.twimg.com/media/A?format=jpg&name=orig');
  });

  it('leaves other URLs alone', () => {
    expect(origUrl('https://x.com/a')).toBe('https://x.com/a');
  });
});

describe('findValidImageUrl', () => {
  it('returns the first format that loads', async () => {
    const tried: string[] = [];
    const url = await findValidImageUrl(
      'https://pbs.twimg.com/media/B?format=webp&name=small',
      async (candidate) => {
        tried.push(candidate);
        return candidate.includes('format=png');
      },
    );
    expect(url).toBe('https://pbs.twimg.com/media/B?format=png&name=orig');
    expect(tried).toEqual([
      'https://pbs.twimg.com/media/B?format=jpg&name=orig',
      'https://pbs.twimg.com/media/B?format=png&name=orig',
    ]);
  });

  it('caches hits', async () => {
    let calls = 0;
    const check = async () => {
      calls++;
      return true;
    };
    await findValidImageUrl('https://pbs.twimg.com/media/C.jpg', check);
    await findValidImageUrl('https://pbs.twimg.com/media/C.jpg:large', check);
    expect(calls).toBe(1);
  });

  it('falls back to the jpg orig URL and retries next time', async () => {
    let calls = 0;
    const none = async () => {
      calls++;
      return false;
    };
    expect(
      await findValidImageUrl('https://pbs.twimg.com/media/D.gif', none),
    ).toBe('https://pbs.twimg.com/media/D?format=gif&name=orig');
    await findValidImageUrl('https://pbs.twimg.com/media/D.gif', none);
    expect(calls).toBe(8);
  });
});

describe('filenames', () => {
  const url = 'https://pbs.twimg.com/media/A?format=jpg&name=orig';

  it('adds the name suffix unless suppressed', () => {
    expect(imageFilename(url, { suppressSuffix: false })).toBe('A-orig.jpg');
    expect(imageFilename(url, { suppressSuffix: true })).toBe('A.jpg');
    expect(
      imageFilename('https://pbs.twimg.com/media/A.png', {
        suppressSuffix: false,
      }),
    ).toBe('A.png');
  });

  it('builds ZIP names', () => {
    expect(zipImageFilename('user', '123', 2, 'png')).toBe('user-123-img2.png');
  });

  it('names downloads after the photo link when asked', () => {
    const linkUrl = 'https://x.com/user/status/123/photo/3';
    expect(
      downloadFilename(url, {
        linkUrl,
        sameAsZip: true,
        suppressSuffix: false,
      }),
    ).toBe('user-123-img3.jpg');
    expect(
      downloadFilename(url, {
        linkUrl,
        sameAsZip: false,
        suppressSuffix: false,
      }),
    ).toBe('A-orig.jpg');
    expect(
      downloadFilename(url, {
        linkUrl: 'https://x.com/user',
        sameAsZip: true,
        suppressSuffix: true,
      }),
    ).toBe('A.jpg');
  });

  it('falls back to the media viewer URL of the page', () => {
    expect(
      downloadFilename(url, {
        pageUrl: 'https://x.com/user/status/123/photo/2',
        sameAsZip: true,
        suppressSuffix: false,
      }),
    ).toBe('user-123-img2.jpg');
    expect(
      downloadFilename(url, {
        linkUrl: 'https://x.com/q/status/9/photo/1',
        pageUrl: 'https://x.com/user/status/123/photo/2',
        sameAsZip: true,
        suppressSuffix: false,
      }),
    ).toBe('q-9-img1.jpg');
    expect(
      downloadFilename(url, {
        pageUrl: 'https://x.com/user/status/123',
        sameAsZip: true,
        suppressSuffix: false,
      }),
    ).toBe('A-orig.jpg');
  });
});
