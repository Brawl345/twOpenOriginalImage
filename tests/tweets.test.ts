import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseTweets, type Tweet, TweetStore } from '../lib/tweets';

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf8'),
  );

const byId = (tweets: Tweet[], id: string): Tweet => {
  const tweet = tweets.find((t) => t.id === id);
  if (!tweet) {
    throw new Error(`tweet ${id} not parsed`);
  }
  return tweet;
};

const mediaId = (url: string) => url.match(/\/media\/([^.]+)/)?.[1];

describe.each(['rweb', 'xweb'])('parseTweets on %s TweetDetail', (client) => {
  it('reads author, text, date and all photos of a post', () => {
    const tweets = parseTweets(fixture(`${client}-tweet-detail.json`));
    const tweet = byId(tweets, '2122352509721190612');
    expect(tweet.screenName).toBe('SpaceX');
    expect(tweet.url).toBe('https://x.com/SpaceX/status/2122352509721190612');
    expect(tweet.text).toBe(
      'Starship landing burn on final approach for catch https://x.com/SpaceX/status/2122352509721190612/photo/1',
    );
    expect(tweet.createdAt).toBe(Date.UTC(2026, 10, 16, 15, 34, 4));
    expect(tweet.quotedId).toBeNull();
    expect(tweet.photos).toHaveLength(9);
    expect(tweet.photos[0]).toEqual({
      url: 'https://pbs.twimg.com/media/HXQbL9EXQAErWao.jpg',
      width: 4096,
      height: 2304,
      altText: null,
    });
    expect(tweet.photos[1]?.url).toBe(
      'https://pbs.twimg.com/media/HXQbOjyXkAAEhiI.jpg',
    );
    expect(tweet.photos[8]).toMatchObject({
      url: 'https://pbs.twimg.com/media/HXQbZmaXYAA5jnL.jpg',
      width: 3456,
      height: 2160,
    });
  });

  it('reads a quote, the quoted post, alt texts and expanded links', () => {
    const tweets = parseTweets(fixture(`${client}-tweet-detail-quote.json`));
    const outer = byId(tweets, '1695944187999375708');
    expect(outer.screenName).toBe('NASA');
    expect(outer.text).toMatch(
      /^The X is for eXtremes: .* watch liftoff here: https:\/\/youtu\.be\/3TTTJ20iRbs$/s,
    );
    expect(outer.createdAt).toBe(Date.UTC(2023, 7, 27, 23, 39, 38));
    expect(outer.quotedId).toBe('1695914219370164702');
    expect(outer.quotedUrl).toBe(
      'https://x.com/NASAUniverse/status/1695914219370164702',
    );
    expect(outer.photos.map((p) => mediaId(p.url))).toEqual([
      'F4kzhzVWEAQD2Nq',
    ]);
    expect(outer.photos[0]?.altText).toMatch(/^A completed X-ray Mirror/);

    const quoted = byId(tweets, '1695914219370164702');
    expect(quoted.screenName).toBe('NASAUniverse');
    expect(quoted.name).toBe('NASA Universe');
    expect(quoted.text).toMatch(
      /^Let’s do launch!\n\n.* https:\/\/x\.com\/NASAUniverse\/status\/1695914219370164702\/photo\/1$/s,
    );
    expect(quoted.photos).toEqual([
      expect.objectContaining({
        url: 'https://pbs.twimg.com/media/F4kY_YoWcAENIk5.jpg',
        width: 3024,
        height: 4032,
      }),
    ]);
  });
});

describe('parseTweets edge cases', () => {
  const user = (screen_name: string) => ({
    user_results: { result: { core: { screen_name, name: screen_name } } },
  });

  it('unwraps TweetWithVisibilityResults', () => {
    const tweets = parseTweets({
      data: {
        tweet_results: {
          result: {
            __typename: 'TweetWithVisibilityResults',
            tweet: {
              rest_id: '4',
              core: user('author'),
              legacy: { full_text: 'limited' },
            },
          },
        },
      },
    });
    expect(tweets.map((t) => [t.id, t.screenName, t.text])).toEqual([
      ['4', 'author', 'limited'],
    ]);
  });

  it('stores a retweet under the original post', () => {
    const tweets = parseTweets({
      data: {
        tweet_results: {
          result: {
            rest_id: '1',
            core: user('retweeter'),
            legacy: {
              full_text: 'RT @author: hi',
              retweeted_status_result: {
                result: {
                  rest_id: '2',
                  core: user('author'),
                  legacy: { full_text: 'hi &amp; bye' },
                },
              },
            },
          },
        },
      },
    });
    expect(tweets.map((t) => [t.id, t.screenName, t.text])).toEqual([
      ['2', 'author', 'hi & bye'],
    ]);
  });

  it('reads xweb retweets and alt texts', () => {
    const tweets = parseTweets({
      data: {
        tweet_results: {
          result: {
            rest_id: '1',
            legacy: {
              retweeted_status_results: {
                result: {
                  rest_id: '2',
                  core: user('author'),
                  details: { full_text: 'x', created_at_ms: 5 },
                  media_entities2: [
                    {
                      type: 'photo',
                      media_url_https: 'https://pbs.twimg.com/media/A.jpg',
                      original_info: { width: 1, height: 2 },
                      ext_alt_text: 'a cat',
                    },
                    { type: 'video', media_url_https: 'v' },
                  ],
                },
              },
            },
          },
        },
      },
    });
    expect(tweets).toHaveLength(1);
    expect(tweets[0]?.photos).toEqual([
      {
        url: 'https://pbs.twimg.com/media/A.jpg',
        width: 1,
        height: 2,
        altText: 'a cat',
      },
    ]);
  });

  it('links a tombstoned quote by ID and falls back to the ID date', () => {
    const [tweet] = parseTweets({
      data: {
        tweetResult: {
          result: {
            rest_id: '2122352509721190612',
            core: user('a'),
            legacy: {
              full_text: 'q',
              quoted_status_id_str: '9',
              quoted_status_permalink: {
                expanded: 'https://twitter.com/b/status/9',
              },
            },
            quoted_status_result: {
              result: { __typename: 'TweetTombstone', tombstone: {} },
            },
          },
        },
      },
    });
    expect(tweet?.quotedId).toBe('9');
    expect(tweet?.quotedUrl).toBe('https://x.com/b/status/9');
    expect(tweet?.createdAt).toBe(Date.UTC(2026, 10, 16, 15, 34, 4, 377));
  });

  it('prefers the note tweet text', () => {
    const [tweet] = parseTweets({
      data: {
        tweet_results: {
          result: {
            rest_id: '3',
            core: user('a'),
            note_tweet: {
              note_tweet_results: {
                result: {
                  text: 'long https://t.co/x',
                  entity_set: {
                    urls: [
                      { url: 'https://t.co/x', expanded_url: 'https://e.com' },
                    ],
                  },
                },
              },
            },
            legacy: { full_text: 'short' },
          },
        },
      },
    });
    expect(tweet?.text).toBe('long https://e.com');
  });
});

describe('TweetStore', () => {
  const tweet = (id: string, photos = 0): Tweet => ({
    id,
    screenName: 'a',
    name: 'a',
    text: '',
    createdAt: 0,
    url: '',
    quotedId: null,
    quotedUrl: null,
    photos: Array.from({ length: photos }, (_, i) => ({
      url: `${i}`,
      width: 1,
      height: 1,
      altText: null,
    })),
  });

  it('keeps the longer photo list', () => {
    const store = new TweetStore();
    store.add(tweet('1', 3));
    store.add(tweet('1', 0));
    expect(store.get('1')?.photos).toHaveLength(3);
  });

  it('drops the oldest entry over the limit', () => {
    const store = new TweetStore(2);
    store.add(tweet('1'));
    store.add(tweet('2'));
    store.add(tweet('3'));
    expect(store.get('1')).toBeNull();
    expect(store.get('3')).not.toBeNull();
  });

  it('adds every tweet of a response', () => {
    const store = new TweetStore();
    store.addResponse(fixture('xweb-tweet-detail-quote.json'));
    expect(store.get('1695914219370164702')?.screenName).toBe('NASAUniverse');
  });
});
