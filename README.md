# Twitter View Original Images (twOpenOriginalImage)

Open images on X in original size. Adds an "Original" button to tweets with images, shows them in an overlay or opens each in its own tab, downloads them one by one or as a ZIP and redirects `pbs.twimg.com/media/…` URLs to the original size.

Fork of [twOpenOriginalImage](https://github.com/furyutei/twOpenOriginalImage) by furyu with support for x.com.

## Install

Download the `.xpi` (Firefox) or `.crx` (Chrome) from the [latest release](https://github.com/Brawl345/twOpenOriginalImage/releases/latest). Installed copies update themselves.

## Development

```bash
npm install
npm run dev
```

`npm run dev:firefox` starts Firefox instead. `npm run check` runs type checks, Biome, the tests and `web-ext lint`.
## Release

Write the changes under `## Unreleased` in `CHANGES.md`, then run `npm run release -- <version>`. `npm run release -- --dry-run <version>` builds the packages into `output/` without committing anything.

The release packs a CRX (signed with `public.pem`, which must never be regenerated because the Chrome extension ID derives from it) and an unsigned XPI, writes `updates.xml` and `updates.json`, pushes the commit and tag and creates a GitHub release with both files. Installed copies update through these manifests.

## License

MIT, see [LICENSE](LICENSE).
