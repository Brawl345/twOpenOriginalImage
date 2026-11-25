import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('fetchTweetResult', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('activates a guest token once and reuses it', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ guest_token: 'g1' }))
      .mockResolvedValueOnce(json({ data: 1 }))
      .mockResolvedValueOnce(json({ data: 2 }));
    const { fetchTweetResult } = await import('../lib/guest-api');

    expect(await fetchTweetResult('5')).toEqual({ data: 1 });
    expect(await fetchTweetResult('6')).toEqual({ data: 2 });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe(
      '/graphql/U8lc5aomF5krJzZ9vJ9wxg/TweetResultByRestId',
    );
    expect(
      JSON.parse(parsed.searchParams.get('variables') ?? ''),
    ).toMatchObject({ tweetId: '5' });
    expect(init.credentials).toBe('omit');
    expect((init.headers as Record<string, string>)['X-Guest-Token']).toBe(
      'g1',
    );
  });

  it('renews the token after a failed request', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ guest_token: 'old' }))
      .mockResolvedValueOnce(json({}, 403))
      .mockResolvedValueOnce(json({ guest_token: 'new' }))
      .mockResolvedValueOnce(json({ data: 1 }));
    const { fetchTweetResult } = await import('../lib/guest-api');

    expect(await fetchTweetResult('5')).toEqual({ data: 1 });
    const [, init] = fetchMock.mock.calls[3] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['X-Guest-Token']).toBe(
      'new',
    );
  });

  it('throws when the retry fails too', async () => {
    fetchMock.mockResolvedValue(json({}, 500));
    const { fetchTweetResult } = await import('../lib/guest-api');
    await expect(fetchTweetResult('5')).rejects.toThrow('500');
  });
});
