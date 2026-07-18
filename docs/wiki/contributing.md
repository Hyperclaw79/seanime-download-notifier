---
title: Contributing workflow
summary: Use the develop branch, understand CI triggers, and promote changes safely.
---

# Contributing workflow

## Branch roles

| Branch | Role |
| --- | --- |
| `develop` | Integration branch for day-to-day work and release-candidate validation |
| `main` | Release branch for promoted, public-ready changes |

External contributors should fork the GitHub repository and open pull requests against `develop`. Maintainer work lands on Forgejo `develop` first, where it can be treated as a beta or release candidate before being promoted.

## Maintainer remote flow

1. Branch from `develop`.
2. Commit normally; do not preserve a single-commit history unless a one-off cleanup explicitly requires it.
3. Push to Forgejo `develop` first.
4. Validate the Forgejo build, Mock UI E2E, generated manifests, and live Denshi behavior when relevant.
5. Promote to `main` through a pull request when the change is ready.
6. Push to GitHub only when intentionally publishing public/community updates.

Forgejo is the maintainer beta mirror. GitHub is the public community surface.

## CI trigger model

The build workflows run in two situations:

- pull requests targeting `develop` or `main`;
- direct pushes to `develop` or `main`.

This intentionally keeps both checks. Pull-request CI validates the proposed diff before merge. Push CI validates the exact integrated commit after merge and, on Forgejo, creates the immutable commit build that tag releases reuse. Feature branch pushes do not run the full build unless there is a pull request, which avoids most duplicate CI runs while preserving review and post-merge confidence.

## Before opening a pull request

Run the focused checks for your change, then the broader suite when the change crosses runtime boundaries:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Also run `npm run manifest:validate` for manifest or URL changes, `npm run docs` for exported API changes, and `npm run docs:wiki` for handbook changes.

Never commit generated manifests, built bundles, webhook URLs, local absolute paths, or private hosting details intended only for the maintainer mirror.
