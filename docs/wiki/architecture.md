---
title: System architecture
summary: Follow a torrent from Auto Downloader ownership through completion and provider delivery.
---

# System architecture

## Lifecycle at a glance

```text
Auto Downloader queues torrent
        |
        v
isolated ownership hook --$store signal--> UI runtime
                                             |
                                             v
                                  durable track in $storage
                                             |
                                      torrent-client polling
                                             |
                                  progress >= 1 means complete
                                             |
                                             v
                                  enabled provider adapters
                                             |
                         success: receipt + notified timestamp
                         failure: pending record retained for retry
```

`onAutoDownloaderAfterDownloadTorrent` means *queued*, not completed. Its job is to establish that Seanime owns a hash. The UI runtime consumes that signal, persists a durable record under `download-notifier-state-v1`, and polls `ctx.torrentClient.getTorrents()` while work is pending.

## Source boundaries

| Area | Responsibility |
| --- | --- |
| `src/plugin.ts` | Define shared factories and register callbacks; no application workflow |
| `src/core/` | Portable tracking, completion, retention, and scheduling logic |
| `src/providers/` | Provider schema, normalization, payload construction, readiness, transport |
| `src/seanime/isolated/` | Self-contained adapters executed by Denshi |
| `src/seanime/shared/` | Factories recreated through `$shared` inside isolated runtimes |
| `mock-seanime/` | Browser reference UI and deterministic E2E harness |

## Durable data

`$storage` owns data that must survive plugin and Seanime restarts:

- `download-notifier-state-v1`: torrent tracks, progress, attempts, provider receipts, completion and notification timestamps;
- `download-notifier-provider-config-v1`: provider configuration document;
- the provider configuration JSON backup and bounded activity history used by the current runtime.

`$store` is transient cross-runtime signaling. Losing a signal after restart must not destroy durable state.

## Completion and delivery

Completion is `progress >= 1`; seeding or stopped status does not make a completed torrent incomplete. Delivery is provider-record aware. Every enabled, ready provider receives the event independently, and successful provider IDs are recorded in `providerReceipts`.

A track receives `notifiedAt` only after all applicable providers have receipts. If any delivery fails, its error and attempt metadata are retained and a later poll retries only missing deliveries.

## Concurrency and identity

The hash locates a torrent snapshot, but a logical track also has an identity token. Before an asynchronous poll writes progress or delivery state, it reloads storage and confirms that it is still operating on the same track. This prevents:

- concurrent downloads from borrowing one another's metadata;
- a stale async result from mutating a newer record that reused a hash;
- a development simulation from overwriting a real Auto Downloader track;
- provider receipts from one completion leaking into another.

## Development simulation

Native Auto Downloader Simulation remains the user-facing trigger. When an empty simulated run is allowed to fall back, the run-completed hook sends a transient `$store` signal. The development UI runtime selects a completed torrent snapshot, creates a separately identified smoke track, delays completion so progress is observable, and sends it through the same delivery pipeline. Production builds compile this path out.
