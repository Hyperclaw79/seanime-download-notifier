---
title: Denshi runtime isolation
summary: Understand the callback boundary that ordinary TypeScript refactors can accidentally break.
---

# Denshi runtime isolation

Seanime/Denshi does not execute every registered callback in the bundle's original lexical environment. `$ui.register(...)` and plugin hook callbacks are evaluated in isolated Goja runtimes. A callback that looks valid to TypeScript may therefore fail at runtime with a missing helper or constant.

## The callback contract

Inside a registered callback body:

- do not invoke an imported helper;
- do not reference a module-scope constant;
- do not capture mutable outer state;
- define callback-specific constants and helpers inside the callback;
- use APIs available to Goja and the supplied Seanime context, not Node.js APIs.

This is intentionally different from ordinary application code. Keep modularity outside the boundary and make the isolated adapter self-contained inside it.

## Sharing reusable behavior

Provider and metadata factories are registered in `src/plugin.ts` with `$shared.define(...)`. The UI callback obtains fresh instances with `$shared.use(...)` inside its isolated runtime. The factory itself must also be self-contained: imported dependencies or module constants referenced by its body can reproduce the same failure one layer later.

```text
bundle initialization
  $shared.define(stable-name, self-contained factory)
  register(self-contained callback)

isolated callback runtime
  $shared.use(stable-name)
  call methods on recreated adapter
```

## Crossing runtimes

Use `$store` for transient messages such as:

- an Auto Downloader-owned torrent waiting to be persisted;
- a request to poll immediately;
- an empty native simulation completion signal.

Use `$storage` for provider records and torrent lifecycle state. A hook must never send notifications directly; the UI runtime owns polling and provider dispatch.

## Goja compatibility

Do not assume all built-ins have browser or Node semantics in the embedded runtime. Prefer small explicit coercion and guard functions already established in the isolated callback. A previous `Number(...)` assumption, for example, surfaced as “Not a function: [object Object]” under Goja despite working in normal JavaScript tests.

## Regression checklist

When changing registration or a shared factory:

1. Keep `src/plugin.ts` declarative and small.
2. Extend `test/unit/plugin-entrypoint.test.ts` so it examines the bundled callback/factory body.
3. Assert registration occurs at initialization, not inside `$ui.register`.
4. Build both production and development bundles.
5. Reload the extension in Denshi and inspect the actual runtime error stream.

Never “fix” isolation by moving the entire application into `src/plugin.ts`; that removes useful boundaries without making callbacks safer.
