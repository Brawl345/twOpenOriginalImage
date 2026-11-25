import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GRAPHQL_URL_RE,
  type HookMessage,
  installGraphqlHook,
  isHookMessage,
} from '../lib/graphql-hook';

describe('GRAPHQL_URL_RE', () => {
  it.each([
    ['https://x.com/i/api/graphql/abc/TweetDetail?x=1', true],
    ['https://api.x.com/graphql/abc/HomeTimeline', true],
    ['https://api.x.com/1.1/guest/activate.json', false],
    ['https://x.com/home', false],
  ])('%s → %s', (url, expected) => {
    expect(GRAPHQL_URL_RE.test(url)).toBe(expected);
  });
});

describe('installGraphqlHook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const fakeWindow = (fetchImpl: typeof fetch) => {
    const posted: HookMessage[] = [];
    const win = {
      location: { href: 'https://x.com/home', origin: 'https://x.com' },
      fetch: fetchImpl,
      postMessage: (message: HookMessage) => posted.push(message),
      XMLHttpRequest: class {
        open() {}
      },
    } as unknown as Window & typeof globalThis;
    installGraphqlHook(win);
    return { win, posted };
  };

  it('posts GraphQL fetch responses and passes the response through', async () => {
    const { win, posted } = fakeWindow(async () => new Response('{"data":1}'));
    const response = await win.fetch(
      'https://api.x.com/graphql/q/HomeTimeline',
    );
    expect(await response.text()).toBe('{"data":1}');
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toEqual({
      tag: 'x-view-original-images:graphql',
      body: '{"data":1}',
    });
    expect(isHookMessage(posted[0])).toBe(true);
  });

  it('resolves relative URLs, takes POST and ignores other requests', async () => {
    const { win, posted } = fakeWindow(
      async (input) => new Response(String(input)),
    );
    await win.fetch('/i/api/graphql/q/TweetDetail');
    await win.fetch('/i/api/1.1/jot');
    await win.fetch('https://api.x.com/graphql/q/CreateTweet', {
      method: 'POST',
    });
    await vi.waitFor(() => expect(posted).toHaveLength(2));
    expect(posted.map((m) => m.body)).toEqual([
      '/i/api/graphql/q/TweetDetail',
      'https://api.x.com/graphql/q/CreateTweet',
    ]);
  });

  it('skips error responses', async () => {
    const { win, posted } = fakeWindow(
      async () => new Response('{}', { status: 429 }),
    );
    await win.fetch('https://api.x.com/graphql/q/HomeTimeline');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(posted).toHaveLength(0);
  });

  it('rejects foreign messages', () => {
    expect(isHookMessage({ tag: 'other', body: '' })).toBe(false);
    expect(isHookMessage(null)).toBe(false);
  });
});
