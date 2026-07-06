# Mock Seanime

This React/Vite app is a local E2E harness, not a replacement for Seanime. It models the extension settings, Auto Downloader hook inputs, tracked torrent snapshots, provider failure/retry, persisted de-dupe state, retention, logs, and captured Discord payloads without contacting Discord or a torrent client.

Run `npm run mock:dev` from the repository root.

The shell and component styling are based on Seanime's current upstream design tokens and official screenshots, including its collapsed icon rail, `#070707` background, Inter typography, pill navigation, grouped extension cards, and compact controls. The **Plugin test bench** section is intentionally mock-only and is labeled as such; Seanime itself does not expose these runtime-testing panels.

References:

- [Official Seanime extensions screenshot](https://seanime.app/bucket/img-2025-10-29-19-36-02.webp?updatedAt=1761766573324)
- [Official Auto Downloader screenshot](https://seanime.app/bucket/guides/img-2026-01-27-10-38-21.webp)
- [Current upstream global design tokens](https://github.com/5rahim/seanime/blob/main/seanime-web/src/app/globals.css)
- [Current upstream extensions page](https://github.com/5rahim/seanime/tree/main/seanime-web/src/app/(main)/extensions)
