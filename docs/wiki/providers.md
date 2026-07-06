---
title: Provider development
summary: Add a new notification provider without coupling it to tracking or the generic UI runtime.
---

# Provider development

The provider catalog is a registry of provider *types*. Discord is one type. The UI renders a card from the selected adapter's schema and stores a provider record; it must not know Discord field names, payload shapes, or endpoints.

## Adapter responsibilities

A provider adapter owns:

- stable `type` and user-facing label;
- field definitions used by the generic UI renderer;
- default record creation;
- normalization and migration of stored values;
- readiness validation;
- notification payload construction;
- network transport and useful delivery errors.

The UI runtime owns only generic orchestration: catalog lookup, provider-document persistence, field rendering, save/delete/test actions, and delivery dispatch.

## Stored shape

```json
{
  "providers": [
    {
      "id": "discord-main",
      "type": "discord",
      "enabled": true,
      "label": "Discord",
      "config": {}
    }
  ]
}
```

Provider-specific configuration belongs in `config`. Do not add it to root manifest preferences. Those preferences are reserved for global polling, retention, enablement, and development safeguards.

## Add a provider type

1. Implement a self-contained isolated adapter factory under `src/providers/`.
2. Define its field schema, defaults, normalization, readiness, payload builder, and sender in that provider module.
3. Register the factory under a stable `$shared.define(...)` name in `src/plugin.ts`.
4. Add the recreated adapter to the shared provider catalog.
5. Add only the network domains required by that provider to manifest permissions.
6. Add provider unit tests for malformed config, defaults, payload variants, success, and transport failure.
7. Extend callback/factory isolation regression tests.
8. Add the generated provider card and its behavior to Mock UI E2E coverage.

## Design review questions

- Does `ui-runtime.ts` mention the new provider by name? If so, move that behavior into the adapter.
- Can malformed persisted config crash the whole catalog? Normalization should reject or repair it.
- Can one provider succeed while another fails? Receipts must preserve the successful delivery.
- Does a test notification reuse the adapter's normal payload and transport path?
- Are secrets absent from activity logs, rendered tracking cards, and thrown errors?
- Is the adapter factory self-contained when recreated by `$shared`?

Provider-neutral wording matters in UI, manifests, and documentation. Say “provider” unless the behavior really is Discord-specific.
