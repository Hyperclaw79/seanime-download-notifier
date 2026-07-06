---
title: Development and testing
summary: Pick the right test layer, exercise development simulation, and verify changes proportionally.
---

# Development and testing

## Test layers

| Layer | Location | Best for |
| --- | --- | --- |
| Unit | `test/unit/` | Pure state, config, retention, metadata, provider payloads |
| Integration | `test/integration/` | Hook signals, storage lifecycle, retries, restart de-duplication |
| Bundle/isolation | `test/unit/plugin-entrypoint.test.ts` | Registrations, callback closures, shared factories, production gating |
| Browser E2E | `mock-seanime/tests/` | Provider forms, development/production visibility, tracked state, activity UI |
| Live Denshi | installed dev manifest | Embedded runtime behavior and Seanime API integration |

Run focused tests while iterating, then the full relevant suite:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:e2e
npm run build:plugin
npm run mock:build
```

## Native simulation smoke flow

In the development plugin preferences, enable:

1. **Development simulation smoke mode**
2. **Allow development simulation notifications**
3. **Use completed torrent fallback when native simulation finds no candidates** (only when testing an empty native run)

Then trigger Seanime's native Auto Downloader Simulation. There is deliberately no separate smoke-test button. The configured simulation delay leaves the temporary track in progress before it completes. A fallback requires an existing completed torrent snapshot and never overwrites a real track.

Production builds must hide development controls and compile fallback behavior out. Test both development and production Mock routes whenever visibility changes.

## Coverage with intent

The repository enforces line, function, statement, and branch coverage. A percentage alone is not enough: inspect uncovered branch arcs and add scenarios that express meaningful outcomes—malformed storage, provider failure after partial success, missing torrent snapshots, reused hashes, and stale async writes.

Avoid tests that merely reproduce implementation statements. Prefer lifecycle assertions against persisted state, provider receipts, and rendered user-visible status.

## Debugging order

1. Reproduce on the narrowest layer.
2. Read Denshi logs for an actual callback exception.
3. Check the development manifest filename and embedded payload before blaming the UI.
4. Inspect `$storage` migration and normalization when data disappears after reload.
5. Confirm the runtime-update channel when progress changes only after refresh.
6. Rebuild and recopy the development manifest before retesting source changes.

Do not remove live updates, persistence, or runtime safeguards just to make a symptom disappear. Preserve the behavior and repair the failing boundary.
