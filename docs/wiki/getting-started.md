---
title: Start here
summary: Set up the repository, run the checks, and load a development build in Denshi.
---

# Start here

## Prerequisites

- Node.js 20 or newer and npm
- Seanime/Denshi for live plugin validation
- Chromium for the Mock UI end-to-end suite

Install both workspaces:

```powershell
npm install
npm --prefix mock-seanime install
npx playwright install chromium
```

## First verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

`npm run build` produces both plugin bundles, builds the Mock UI and documentation, and validates manifests. A missing Playwright browser is an environment problem; install Chromium before treating it as a product failure.

## Run the Mock UI

```powershell
npm run mock:dev
```

The normal route mirrors the plugin webview. It includes provider management, runtime status, tracked torrents, and redacted activity. Development mode exposes development-only status and controls. `?harness=1` adds mutation controls used by Playwright; those controls are not part of the actual plugin UI.

## Load the development plugin

```powershell
npm run build:plugin
npm run manifest:dev
Copy-Item .\seanime-download-notifier-dev.json "$env:APPDATA\Seanime\extensions\seanime-download-notifier-dev.json" -Force
```

The destination filename must exactly match the extension ID. Denshi may discover an arbitrarily named JSON file at startup, but **Reload Plugin** resolves the manifest by ID and expects `seanime-download-notifier-dev.json`.

## Safe first change

1. Make the smallest source change.
2. Run the nearest unit or integration test while iterating.
3. Run lint, type checking, and the full test suite.
4. Rebuild the plugin.
5. Regenerate and copy the development manifest when its local payload path, hosted icon URL, or manifest fields may have changed.
6. Confirm the behavior in Denshi and inspect runtime errors before diagnosing a UI symptom.

Generated files are not source: do not commit `dist/`, `docs/api/`, `seanime-download-notifier.json`, or `seanime-download-notifier-dev.json`.
