---
title: Manifests and releases
summary: Work with development and production manifests, URL hosts, CI artifacts, and immutable releases.
---

# Manifests and releases

## Files and ownership

| File | Role | Commit? |
| --- | --- | --- |
| `seanime-download-notifier.json` | Generated production install/update manifest | No |
| `seanime-download-notifier-dev.example.json` | Portable development template | Yes |
| `seanime-download-notifier-dev.json` | Generated development manifest | No |
| `scripts/manifest-shared.ts` | Shared fields, preferences, permissions, host derivation | Yes |
| `dist/plugin.js`, `dist/plugin.dev.js` | Generated bundles | No |

Never rename generated manifests to a generic `manifest.json`. Seanime reload behavior depends on the extension-ID filename, and public install URLs should be explicit.

## Development manifest

`npm run manifest:dev` writes a local development manifest that points at the local development payload and a hosted raw logo URL. Copy it using the exact development ID:

```powershell
Copy-Item .\seanime-download-notifier-dev.json "$env:APPDATA\Seanime\extensions\seanime-download-notifier-dev.json" -Force
```

The generated file is not a source of truth and may contain machine-specific content.

## Production URLs

A production manifest derives its repository-facing URLs from one selected raw repository base. `icon` uses that raw host, while `website` and `readme` point back to the human repository page and wiki derived from the same repository. `manifestURI` and `payloadURI` may point to immutable release assets on the matching release host. This matters for GitHub builds because real Seanime marketplace plugins commonly use `raw.githubusercontent.com` for raw assets and `github.com` for the repository page and releases.

Seanime renders extension icons as external browser images with `crossOrigin="anonymous"`. The selected raw host must therefore send CORS headers for `assets/logo.png`; GitHub raw already does, while a private Forgejo host may need server-side CORS configuration such as `Access-Control-Allow-Origin: *` for raw asset responses. Do not add the repository host to plugin `networkAccess` for this: that permission controls plugin runtime `fetch`, not the browser image used by the extension card.

The release payload should point to an immutable, versioned release asset rather than a mutable branch file.

```powershell
npm run manifest:release -- `
  --base-url=https://raw.githubusercontent.com/Hyperclaw79/seanime-download-notifier/main `
  --manifest-url=https://github.com/Hyperclaw79/seanime-download-notifier/releases/download/v1.0.0/seanime-download-notifier.json `
  --payload-url=https://github.com/Hyperclaw79/seanime-download-notifier/releases/download/v1.0.0/plugin.js
```

Run `npm run manifest:validate` after any manifest or generator change.

## CI pipeline

Branch and pull-request CI installs locked dependencies, lints, type-checks, runs coverage and browser E2E, builds both UIs, generates the TypeDoc API reference, and validates manifests. The workflows run for pull requests targeting `develop` or `main`, and for direct pushes to those two long-lived branches. This checks proposed changes before merge and then checks the exact integrated commit after merge.

On Forgejo push builds, a successful integrated commit build is stored as a commit-addressed Generic Package Registry bundle so release automation can reuse the exact verified output. Pull-request builds validate the code but do not publish commit build packages.

A matching `vMAJOR.MINOR.PATCH` tag creates permanent release assets:

- production `plugin.js`;
- verified production manifest;
- SHA-256 checksums.

The release workflow also publishes the Markdown handbook from `docs/wiki` to the repository Wiki. The manifest's `readme` field points to that rendered Wiki URL. TypeDoc HTML remains a CI validation output because repository wikis render Markdown; they are not necessarily static HTML hosts.

The release job rejects a tag that differs from `package.json`; the generated manifest from the verified commit build is the manifest that gets released.

## Release checklist

1. Update the package version and versioned payload URL together.
2. Generate the production manifest from the intended release host.
3. Run the full build, documentation generation, and manifest validation.
4. Install the release manifest in a clean Seanime instance.
5. Complete one controlled Auto Downloader download.
6. Restart Seanime and verify that delivery is not duplicated.
7. Tag only after the generated release manifest has been inspected for the intended version and hosts.

Transient Actions artifacts are not stable install endpoints. The production payload URI uses the published release asset, while the commit-addressed package is the immutable handoff between build and release workflows.
