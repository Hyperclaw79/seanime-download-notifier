---
title: Contributor handbook
children:
  Start here: getting-started.md
  System architecture: architecture.md
  Denshi runtime isolation: runtime-isolation.md
  Provider development: providers.md
  Development and testing: development-testing.md
  Contributing workflow: contributing.md
  Manifests and releases: manifests-deployment.md
---

# Seanime Download Notifier documentation

This handbook explains how the plugin works, why its unusual runtime boundaries exist, and how to change it safely. It complements the generated API reference: use these guides to understand the system and the API pages to inspect an exported function or type.

## Choose a path

| If you want to… | Start with |
| --- | --- |
| Build and load the plugin locally | [Start here](getting-started.md) |
| Understand ownership, polling, persistence, and delivery | [System architecture](architecture.md) |
| Change a registered hook or the plugin webview | [Denshi runtime isolation](runtime-isolation.md) |
| Add a notification provider | [Provider development](providers.md) |
| Run focused tests or diagnose a failure | [Development and testing](development-testing.md) |
| Open a pull request or understand branch flow | [Contributing workflow](contributing.md) |
| Change URLs, manifests, CI, or release artifacts | [Manifests and releases](manifests-deployment.md) |

## Product boundary

The plugin sends completion notifications only for torrents queued by Seanime's Auto Downloader. It does not monitor arbitrary torrents. Queue events establish ownership; the torrent client remains the source of truth for progress and completion.

Discord is the first delivery provider, not the identity of the product. Provider-neutral tracking and UI code must stay independent of Discord configuration and transport details.

## Generated API reference

`npm run docs` generates the exported core, provider, and Seanime adapter API reference under `docs/api`. The repository Wiki hosts this handbook; contributors can generate the lower-level TypeDoc reference from a clone when inspecting individual functions and types. Isolated callbacks are deliberately not presented as reusable APIs because Denshi recreates them in isolated JavaScript runtimes and bundle-level regression tests guard their constraints.

> **Rule of thumb:** read the architecture and isolation guides before changing `src/seanime/isolated/` or `src/plugin.ts`.
