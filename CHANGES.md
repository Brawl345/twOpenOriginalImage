# Changelog

## Unreleased

- Complete rewrite with a new, fresh design
- Works with old and [new Twitter](https://blog.x.com/en/engineering/rebuilding-the-global-town-square-from-scratch)
- Add settings to turn the extension off on the Media tab of profiles and of searches
- Settings are saved without reloading X tabs
- New options page with light and dark theme and previews of every option
- Add German translation
- Remove TweetDeck support, the custom button text, the tab sorting setting and the userscript

## v0.1.21

- Heavily improve performance while loading modal

## v0.1.20

- Fix >4 image support with conflicting browser extensions (such as Control Panel for Twitter)

## v0.1.19

- Open extension settings on icon click
- Always enable download buttons, ZIP download and the "Download original image" context menu
- Remove disabling overlay, it's always shown
- Reload X tabs only when a setting actually changed
- Redirect `pbs.twimg.com/media/…` URLs with a wrong file extension to the existing image

## v0.1.18

- Use Manifest V3 in Firefox
- Create ZIP files with fflate, saving about 100 KB on every page of X
- Remove jQuery and FileSaver.js
- Fix the missing tweet text file in ZIP downloads

## v0.1.17

- Support x.com
- Fix image display
- Fix broken redirects for image URLs like `pbs.twimg.com/media/<id>.jpg?name=orig`
- Distribute through GitHub releases with automatic updates (new add-on ID, reinstall required)
