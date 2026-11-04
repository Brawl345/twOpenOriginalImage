# Changelog

## Unreleased

- Open extension settings on icon click
- Always enable download buttons, ZIP download and the "Download original image" context menu
- Allow turning off the overlay in Firefox
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
