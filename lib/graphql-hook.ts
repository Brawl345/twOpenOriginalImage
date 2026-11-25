export const GRAPHQL_URL_RE =
  /^https:\/\/(x\.com\/i\/api|api\.x\.com)\/graphql\//;

const HOOK_MESSAGE_TAG = 'x-view-original-images:graphql';

export interface HookMessage {
  tag: typeof HOOK_MESSAGE_TAG;
  body: string;
}

export function isHookMessage(data: unknown): data is HookMessage {
  const message = data as HookMessage | null;
  return message?.tag === HOOK_MESSAGE_TAG && typeof message.body === 'string';
}

export function installGraphqlHook(win: Window & typeof globalThis): void {
  const resolve = (url: string | URL) => {
    try {
      return new URL(url, win.location.href).href;
    } catch {
      return String(url);
    }
  };
  const post = (body: string) => {
    const message: HookMessage = { tag: HOOK_MESSAGE_TAG, body };
    win.postMessage(message, win.location.origin);
  };

  const originalFetch = win.fetch;
  win.fetch = async function (this: unknown, input, init) {
    const response = await originalFetch.call(this, input, init);
    try {
      const url = resolve(input instanceof Request ? input.url : input);
      if (GRAPHQL_URL_RE.test(url) && response.ok) {
        response
          .clone()
          .text()
          .then(post)
          .catch(() => {});
      }
    } catch {}
    return response;
  };

  const xhrOpen = win.XMLHttpRequest.prototype.open;
  win.XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest,
    ...args: Parameters<XMLHttpRequest['open']>
  ) {
    const url = resolve(args[1]);
    if (GRAPHQL_URL_RE.test(url)) {
      this.addEventListener('load', () => {
        try {
          if (this.status < 200 || this.status >= 300) {
            return;
          }
          if (this.responseType === '' || this.responseType === 'text') {
            post(this.responseText);
          } else if (this.responseType === 'json' && this.response) {
            post(JSON.stringify(this.response));
          }
        } catch {}
      });
    }
    return xhrOpen.apply(this, args);
  } as XMLHttpRequest['open'];
}
