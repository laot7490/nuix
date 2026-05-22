# @laot/nuix

Small, framework-agnostic helpers for **FiveM NUI** — callbacks, message listeners, and **LTBridge** `CreateState` sync on the web.

- Zero runtime dependencies
- ESM + CJS + TypeScript declarations
- Works with Vue, React, Svelte, or plain JS

[![npm version](https://img.shields.io/npm/v/@laot/nuix.svg)](https://www.npmjs.com/package/@laot/nuix)
[![license](https://img.shields.io/npm/l/@laot/nuix.svg)](https://github.com/laot7490/nuix/blob/main/LICENSE)

---

## Install

```bash
npm install @laot/nuix
```

---

## What it does

| Problem | nuix API |
|--------|----------|
| Call Lua from the UI | `fetchNui` |
| Dev in the browser without FiveM | `setResourceName`, `setNuiMocks`, per-call `mockData` |
| Listen to `SendNUIMessage` | `onNuiMessage`, `onNuiAction` |
| Apply LTBridge batched state | `applyLtBatch` |
| Full state replace (`_sync` / `_set`) | `replaceLtState` |

---

## 1. fetchNui

Posts JSON to `https://<resource>/<event>` (same as `RegisterNUICallback` on the Lua side).

```ts
import { fetchNui, isEnvBrowser, setResourceName, setNuiMocks } from "@laot/nuix";

if (isEnvBrowser()) {
  setResourceName("myresource");
  setNuiMocks({
    getPlayer: { name: "Dev", level: 99 },
  });
}

const player = await fetchNui<{ name: string; level: number }>("getPlayer", { id: 1 });

// Or pass a one-off mock as the third argument
const mocked = await fetchNui("getPlayer", {}, { name: "Local", level: 1 });
```

In the browser, if there is no mock, `fetchNui` throws with a clear error so you do not hit a dead URL silently.

**Lua:**

```lua
RegisterNUICallback("getPlayer", function(data, cb)
  cb({ name = "John", level = 42 })
end)
```

---

## 2. Messages from Lua

Payloads are **flat** (`{ action = "...", batch = ..., ... }`), not nested under `data`.

```ts
import { onNuiMessage, onNuiAction } from "@laot/nuix";

const unsub = onNuiMessage((data) => {
  console.log(data.action, data.namespace);
});

const unsubLocale = onNuiAction("UpdateLocale", (data) => {
  console.log(data.locale, data.translations);
});

unsub();
```

Extend `NuiMessageData` in your project for custom actions:

```ts
import type { NuiMessageData } from "@laot/nuix";

interface MyMessage extends NuiMessageData {
  items?: string[];
}
```

---

## 3. LTBridge CreateState (batch + sync)

When using `LT.NUI.CreateState` on Lua, the UI receives:

| Lua | `action` | Fields |
|-----|----------|--------|
| Batched edits (same tick) | `UpdatePlayer` (your action name) | `batch`, `deletes?`, `namespace` |
| `:sync()` | `UpdatePlayer_sync` | `state`, `namespace` |
| `:set()` | `UpdatePlayer_set` | `state`, `namespace` |

**Array paths are 1-based** (Lua style), e.g. `"inventory.items.1.name"` → JS array index `0`.

`applyLtBatch` merges nested `batch` objects and applies partial **array index patches** without replacing the whole array (see LTBridge `bridge-nui` behaviour).

### Vue + Pinia

```ts
import { onNuiMessage, applyLtBatch, replaceLtState } from "@laot/nuix";
import { useMainStore } from "@/stores";
import { useLocaleStore } from "@/stores";

onNuiMessage((data) => {
  const main = useMainStore();
  const locale = useLocaleStore();

  switch (data.action) {
    case "UpdatePlayer":
      main.$patch((s) =>
        applyLtBatch(s.player, {
          batch: data.batch,
          deletes: data.deletes,
        }),
      );
      break;
    case "UpdatePlayer_sync":
    case "UpdatePlayer_set":
      main.$patch((s) => replaceLtState(s.player, data.state ?? {}));
      break;
    case "UpdateLocale":
      if (data.locale) locale.updateLocale(data.locale);
      if (data.translations) locale.updateTranslations(data.translations);
      break;
  }
});
```

### React

`applyLtBatch` and `replaceLtState` mutate **in place**. With `useState`, clone first so React sees a new reference:

```ts
setPlayer((prev) => {
  const next = structuredClone(prev);
  applyLtBatch(next, { batch: data.batch, deletes: data.deletes });
  return next;
});

// sync / set
setPlayer(structuredClone(data.state ?? {}));
```

---

## API reference

| Export | Description |
|--------|-------------|
| `isEnvBrowser()` | `true` when not running inside FiveM |
| `getResourceName()` | Host segment for NUI fetch URLs |
| `setResourceName(name)` | Override resource name (browser dev) |
| `fetchNui(event, data?, mockData?)` | NUI callback POST |
| `setNuiMocks(mocks)` | Register browser mocks by event name |
| `clearNuiMocks()` | Clear mocks |
| `onNuiMessage(handler)` | Subscribe to all messages; returns unsubscribe |
| `onNuiAction(action, handler)` | Subscribe to one `action` |
| `applyLtBatch(target, message)` | Apply `batch` + `deletes` |
| `replaceLtState(target, state)` | Full in-place replace for `_sync` / `_set` |
| `LtBatchMessage` | `{ batch?, deletes? }` |
| `NuiMessageData` | Flat message shape |

---

## Migrating from 1.x

Removed in v2:

- `createFetchNui` — use `fetchNui` + `setNuiMocks`
- `onNuiMessage` nested `{ action, data }` — flat payload only
- Locale helpers (`_U`, `registerLocales`, …) — keep locale in your app (e.g. Pinia)
- `NuiEventMap` — optional types in your own codebase

---

## Build

```bash
npm run build
npm run typecheck
```

Requires Node.js 18+.

---

MIT © [LAOT](https://github.com/laot7490)
