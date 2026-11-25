import { afterEach, describe, expect, it } from 'vitest';
import {
  detectAdapter,
  photoImages,
  statusId,
  viewerLocation,
} from '../lib/adapters';
import { rweb } from '../lib/adapters/rweb';
import { xweb } from '../lib/adapters/xweb';

const media = (id: string) =>
  `https://pbs.twimg.com/media/${id}?format=jpg&name=large`;

const setPage = (path: string, html: string) => {
  window.history.replaceState({}, '', path);
  document.body.innerHTML = html;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('helpers', () => {
  it('reads status IDs and viewer paths', () => {
    expect(statusId('/a/status/123')).toBe('123');
    expect(statusId('https://x.com/a/status/123/photo/2')).toBe('123');
    expect(statusId('/home')).toBeNull();
    expect(viewerLocation('/a/status/123/photo/2')).toEqual({
      tweetId: '123',
      photoNumber: 2,
    });
    expect(viewerLocation('/a/status/123')).toBeNull();
  });

  it('picks the adapter from #react-root', () => {
    setPage('/home', '<div id="react-root"></div>');
    expect(detectAdapter(document)).toBe(rweb);
    setPage('/home', '<main></main>');
    expect(detectAdapter(document)).toBe(xweb);
  });
});

describe('rweb', () => {
  const page = `
    <div id="react-root">
      <article data-testid="tweet">
        <a href="/NASA/status/1/photo/1"><div aria-label="Bild"><img src="${media('A')}"></div></a>
        <div role="link">
          <time></time>
          <a href="/NASAUniverse/status/2/photo/1"><div aria-label="Bild"><img src="${media('B')}"></div></a>
          <div role="group" id="quote-bar"></div>
        </div>
        <a href="/NASA/status/1"><time></time></a>
        <div role="group" id="bar"></div>
      </article>
      <div aria-labelledby="modal-header">
        <div role="group" id="viewer-bar"></div>
        <article data-testid="tweet"><div role="group"></div></article>
      </div>
    </div>`;

  it('finds posts, IDs, bars and photos', () => {
    setPage('/NASA/status/1', page);
    const [post] = rweb.findPosts(document);
    if (!post) {
      throw new Error('no post');
    }
    expect(rweb.tweetId(post)).toBe('1');
    expect(rweb.actionBar(post)?.id).toBe('bar');
    expect(photoImages(post)).toHaveLength(2);
    expect(rweb.mediaViewer(document)).toBeNull();
  });

  it('falls back to the photo link for the ID', () => {
    setPage(
      '/home',
      `<article data-testid="tweet"><a href="/u/status/7/photo/1"><img src="${media('A')}"></a></article>`,
    );
    const [post] = rweb.findPosts(document);
    expect(post && rweb.tweetId(post)).toBe('7');
  });

  it('finds the media viewer bar outside the article', () => {
    setPage('/NASA/status/1/photo/1', page);
    expect(rweb.mediaViewer(document)).toMatchObject({
      tweetId: '1',
      photoNumber: 1,
      bar: { id: 'viewer-bar' },
    });
  });
});

describe('xweb', () => {
  const timeline = `
    <div role="link" data-href="/u/status/10">
      <article>
        <a href="/u/status/10/photo/1"><img src="${media('A')}"></a>
        <div role="link" data-slot="embedded-tweet-frame" data-href="/q/status/20">
          <article>
            <a href="/q/status/20/photo/1"><img src="${media('B')}"></a>
            <div role="group" id="quote-bar"></div>
          </article>
        </div>
        <div role="group" id="bar"></div>
      </article>
    </div>`;

  it('skips quoted articles and reads data-href', () => {
    setPage('/home', timeline);
    const posts = xweb.findPosts(document);
    expect(posts).toHaveLength(1);
    const [post] = posts;
    if (!post) {
      throw new Error('no post');
    }
    expect(xweb.tweetId(post)).toBe('10');
    expect(xweb.actionBar(post)?.id).toBe('bar');
    expect(photoImages(post)).toHaveLength(2);
  });

  it('takes the focused post ID from the URL', () => {
    setPage(
      '/u/status/30',
      `<article><a href="/u/status/30/photo/1"><img src="${media('A')}"></a><div role="group"></div></article>`,
    );
    const [post] = xweb.findPosts(document);
    expect(post && xweb.tweetId(post)).toBe('30');
  });

  it('finds the media viewer', () => {
    setPage(
      '/u/status/30/photo/2',
      `<div role="dialog" data-slot="xds-modal-surface">
         <div role="group" id="viewer-bar"></div>
         <article><div role="group"></div></article>
       </div>`,
    );
    expect(xweb.mediaViewer(document)).toMatchObject({
      tweetId: '30',
      photoNumber: 2,
      bar: { id: 'viewer-bar' },
    });
  });
});
