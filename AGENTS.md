# LLM Guidance

## Overview

Chrome/Firefox WebExtension that opens X images in original size. Legacy plain JavaScript by furyu (jQuery, `chrome.*`), wrapped in [WXT](https://wxt.dev) only for building and releasing: Firefox Manifest V2, Chrome Manifest V3.

- `public/` is copied verbatim; its content scripts and pages are registered by hand in `wxt.config.ts`
- `lib/background.js` is bundled through `entrypoints/background.ts`
- `public/js/twOpenOriginalImage.user.js` also runs standalone as a userscript, keep its header working

## Commands (npm + Node 22)

- `npm run dev` / `dev:firefox`: dev build that opens a browser (`NO_OPEN=1` skips the launch)
- `npm run build` / `build:firefox`: production builds → `.output/{chrome,firefox}`
- `npm run check`: types, Biome, tests and `web-ext lint`; run it after every change
- `npm run format`: format with Biome
- `npm run release -- <version>`: release, see README
