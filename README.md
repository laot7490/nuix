# @laot/nuix

FiveM NUI helpers. No runtime deps. ESM + CJS + types.

[![npm version](https://img.shields.io/npm/v/@laot/nuix.svg)](https://www.npmjs.com/package/@laot/nuix)
[![license](https://img.shields.io/npm/l/@laot/nuix.svg)](https://github.com/laot7490/nuix/blob/main/LICENSE)

## Install

```bash
npm install @laot/nuix
```

## API

| Export | Use |
|--------|-----|
| `fetchNui` | Call Lua (`RegisterNUICallback`) |
| `onNuiMessage` / `onNuiAction` | Listen to `SendNUIMessage` |
| `bindLtState` | Wire LTBridge `CreateState` into an object |
| `applyLtBatch` / `replaceLtState` | Low-level patch / full replace |
| `isEnvBrowser` / `setResourceName` / `setNuiMocks` | Browser / Vite dev |

---

## fetchNui

```ts
import { fetchNui, isEnvBrowser, setResourceName, setNuiMocks } from "@laot/nuix";

if (isEnvBrowser()) {
  setResourceName("myresource");
  setNuiMocks({ getPlayer: { name: "Dev", level: 99 } });
}

const player = await fetchNui<{ name: string; level: number }>("getPlayer", { id: 1 });
```

```lua
RegisterNUICallback("getPlayer", function(data, cb)
  cb({ name = "John", level = 42 })
end)
```

---

## Messages

```ts
import { onNuiMessage, onNuiAction } from "@laot/nuix";

const off = onNuiMessage((data) => {
  console.log(data.action);
});

onNuiAction("UpdateLocale", (data) => {
  console.log(data.locale, data.translations);
});

off();
```

---

## LTBridge CreateState

Lua `LT.NUI.CreateState("UpdatePlayer", …)` sends:

| Message | Payload |
|---------|---------|
| `UpdatePlayer` | `batch`, `deletes?` |
| `UpdatePlayer_sync` | `state` |
| `UpdatePlayer_set` | `state` |

Lua array paths are 1-based (`items.1` → JS index `0`).

### Vue + Pinia

```ts
import { defineStore } from "pinia";
import { bindLtState } from "@laot/nuix";

export const usePlayerStore = defineStore("player", {
  state: () => ({
    hud: { health: 100, armor: 100 },
  }),
});

const store = usePlayerStore();
bindLtState("UpdatePlayer", store.$state);
```

`bindLtState` mutates `target` in place and returns an unsubscribe fn.

### Manual / React

`applyLtBatch` and `replaceLtState` also mutate in place. With React state, clone first:

```ts
setPlayer((prev) => {
  const next = structuredClone(prev);
  applyLtBatch(next, { batch: data.batch, deletes: data.deletes });
  return next;
});
```

---

## Migrating from 1.x

- `createFetchNui` → `fetchNui` + `setNuiMocks`
- Nested `{ action, data }` messages → flat payload
- Locale helpers removed — keep locale in your app

## Build

```bash
npm run build
npm run typecheck
```

Node 18+.

MIT © [LAOT](https://github.com/laot7490)
