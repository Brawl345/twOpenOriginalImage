# LLM Guidance

## Overview

Chrome/Firefox WebExtension that opens X images in original size. TypeScript on [WXT](https://wxt.dev), Manifest V3 on both browsers.

- x.com serves two web clients: the old one (rweb, `#react-root`, `data-testid`) and the new one (xweb). DOM access goes through `lib/adapters/{rweb,xweb}.ts`; everything else is shared
- Tweet data comes from X's own GraphQL responses: `entrypoints/page-hook.content.ts` runs in the page (`world: 'MAIN'`), wraps `fetch` and XHR and posts the response text to `x.content`. X's logged-in API needs an `x-client-transaction-id` from its frontend, so `lib/guest-api.ts` only does guest requests (no NSFW) as a fallback; its queryId and features are copied from a HAR of x.com
- Photo lists come from that data, not the DOM: posts carry up to 20 photos, and Control Panel for Twitter renders only 6
- Settings keep the storage keys of the old JavaScript version, whose values may be the strings `'0'`/`'1'`; `parseBool` in `lib/options.ts` reads both

## Commands (npm + Node 22)

- `npm run dev` / `dev:firefox`: dev build that opens a browser (`NO_OPEN=1` skips the launch)
- `npm run build` / `build:firefox`: production builds → `.output/{chrome,firefox}`
- `npm run check`: types, Biome, tests and `web-ext lint`; run it after every change
- `npm run format`: format with Biome
- `npm run release -- <version>`: release, see README
