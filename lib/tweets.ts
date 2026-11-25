export interface Photo {
  url: string;
  width: number;
  height: number;
  altText: string | null;
}

export interface Tweet {
  id: string;
  screenName: string;
  name: string;
  text: string;
  createdAt: number;
  url: string;
  quotedId: string | null;
  quotedUrl: string | null;
  photos: Photo[];
}

// biome-ignore lint/suspicious/noExplicitAny: GraphQL responses are untyped
type Json = any;

interface UrlEntity {
  url?: string;
  expanded_url?: string;
}

const TWITTER_EPOCH_MS = 1288834974657;

function unwrap(result: Json): Json {
  return result?.__typename === 'TweetWithVisibilityResults'
    ? result.tweet
    : result;
}

function tweetId(result: Json): string | null {
  return result?.rest_id ?? result?.legacy?.id_str ?? null;
}

function author(result: Json): { screenName: string; name: string } {
  const user = result?.core?.user_results?.result;
  return {
    screenName: user?.core?.screen_name ?? user?.legacy?.screen_name ?? 'i',
    name: user?.core?.name ?? user?.legacy?.name ?? '',
  };
}

function timestampFromId(id: string): number {
  return Number(BigInt(id) >> 22n) + TWITTER_EPOCH_MS;
}

function createdAt(result: Json, id: string): number {
  const ms =
    result?.details?.created_at_ms ?? Date.parse(result?.legacy?.created_at);
  return Number.isFinite(ms) ? ms : timestampFromId(id);
}

function decodeEntities(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');
}

function expandUrls(text: string, entities: UrlEntity[]): string {
  return entities.reduce(
    (expanded, { url, expanded_url }) =>
      url && expanded_url ? expanded.replaceAll(url, expanded_url) : expanded,
    text,
  );
}

function mediaUrlEntities(text: string, media: Json[]): UrlEntity[] {
  const codePoints = Array.from(text);
  return media.map((item) => ({
    url:
      item?.url ??
      (Array.isArray(item?.indices)
        ? codePoints.slice(item.indices[0], item.indices[1]).join('')
        : undefined),
    expanded_url: item?.expanded_url,
  }));
}

function mediaList(result: Json): Json[] {
  return (
    result?.media_entities2 ??
    result?.legacy?.extended_entities?.media ??
    result?.legacy?.entities?.media ??
    []
  );
}

function tweetText(result: Json, media: Json[]): string {
  const note = result?.note_tweet?.note_tweet_results?.result;
  if (note?.text) {
    return decodeEntities(
      expandUrls(note.text, note.entity_set?.urls ?? []).trim(),
    );
  }
  const raw: string = result?.details?.full_text ?? result?.legacy?.full_text;
  if (!raw) {
    return '';
  }
  const urls: UrlEntity[] =
    result?.url_entities ?? result?.legacy?.entities?.urls ?? [];
  return decodeEntities(
    expandUrls(expandUrls(raw, urls), mediaUrlEntities(raw, media)),
  );
}

function photos(media: Json[]): Photo[] {
  return media
    .filter((item) => item?.type === 'photo' && item.media_url_https)
    .map((item) => ({
      url: item.media_url_https,
      width: item.original_info?.width ?? 0,
      height: item.original_info?.height ?? 0,
      altText: item.ext_alt_text || null,
    }));
}

function quoted(result: Json): { id: string | null; url: string | null } {
  const quotedResult = unwrap(
    result?.quoted_tweet_results?.result ??
      result?.quoted_status_result?.result,
  );
  const permalink: string | undefined =
    result?.legacy?.quoted_status_permalink?.expanded;
  const id =
    tweetId(quotedResult) ??
    result?.legacy?.quoted_status_id_str ??
    permalink?.match(/\/status(?:es)?\/(\d+)/)?.[1] ??
    null;
  if (!id) {
    return { id: null, url: null };
  }
  const screenName =
    quotedResult?.core?.user_results?.result?.core?.screen_name ??
    quotedResult?.core?.user_results?.result?.legacy?.screen_name ??
    permalink?.match(/^https?:\/\/(?:x|twitter)\.com\/([^/]+)\/status/)?.[1] ??
    'i';
  return { id, url: `https://x.com/${screenName}/status/${id}` };
}

function parseTweetResult(result: Json, out: Tweet[]): void {
  const tweet = unwrap(result);
  const id = tweetId(tweet);
  if (!id) {
    return;
  }
  const retweeted = unwrap(
    tweet.legacy?.retweeted_status_results?.result ??
      tweet.legacy?.retweeted_status_result?.result,
  );
  if (retweeted) {
    parseTweetResult(retweeted, out);
    return;
  }
  const quotedResult =
    tweet.quoted_tweet_results?.result ?? tweet.quoted_status_result?.result;
  if (quotedResult) {
    parseTweetResult(quotedResult, out);
  }
  const media = mediaList(tweet);
  const { screenName, name } = author(tweet);
  const quote = quoted(tweet);
  out.push({
    id,
    screenName,
    name,
    text: tweetText(tweet, media),
    createdAt: createdAt(tweet, id),
    url: `https://x.com/${screenName}/status/${id}`,
    quotedId: quote.id,
    quotedUrl: quote.url,
    photos: photos(media),
  });
}

export function parseTweets(response: unknown): Tweet[] {
  const out: Tweet[] = [];
  const walk = (value: Json) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if ((key === 'tweet_results' || key === 'tweetResult') && child) {
        const result = (child as Json).result;
        if (result) {
          parseTweetResult(result, out);
        }
      }
      walk(child);
    }
  };
  walk((response as Json)?.data);
  return out;
}

export class TweetStore {
  readonly #tweets = new Map<string, Tweet>();

  constructor(readonly limit = 5000) {}

  add(tweet: Tweet): void {
    const existing = this.#tweets.get(tweet.id);
    const merged =
      existing && existing.photos.length > tweet.photos.length
        ? { ...tweet, photos: existing.photos }
        : tweet;
    this.#tweets.delete(tweet.id);
    this.#tweets.set(tweet.id, merged);
    if (this.#tweets.size > this.limit) {
      const oldest = this.#tweets.keys().next().value;
      if (oldest !== undefined) {
        this.#tweets.delete(oldest);
      }
    }
  }

  addResponse(response: unknown): void {
    for (const tweet of parseTweets(response)) {
      this.add(tweet);
    }
  }

  get(id: string): Tweet | null {
    return this.#tweets.get(id) ?? null;
  }
}
