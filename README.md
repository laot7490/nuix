# NUIX

[![npm version](https://img.shields.io/npm/v/@laot/nuix.svg)](https://www.npmjs.com/package/@laot/nuix)
[![license](https://img.shields.io/npm/l/@laot/nuix.svg)](https://github.com/laot7490/nuix/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@laot/nuix)](https://bundlephobia.com/package/@laot/nuix)

> Modular, type-safe TypeScript library for FiveM NUI projects. Zero runtime dependencies.

## Install

```bash
npm install @laot/nuix
pnpm add @laot/nuix
yarn add @laot/nuix
bun add @laot/nuix
```

## Quick Start

### 1. Define Your Event Maps

```ts
import type { NuiEventMap } from "@laot/nuix";

// fetchNui callbacks (TS → Lua → TS)
interface CallbackEvents extends NuiEventMap {
  getPlayer:  { data: { id: number }; response: { name: string; level: number } };
  sendNotify: { data: { message: string }; response: void };
}

// Lua push messages (Lua → TS via SendNUIMessage)
interface MessageEvents extends NuiEventMap {
  showMenu: { data: { items: string[] }; response: void };
  hideMenu: { data: void; response: void };
}
```

### 2. Typed FetchNui

```ts
import { createFetchNui } from "@laot/nuix";

const fetchNui = createFetchNui<CallbackEvents>();

const player = await fetchNui("getPlayer", { id: 1 });
console.log(player.name); // string

await fetchNui("sendNotify", { message: "Hello!" });

// With timeout
const data = await fetchNui("getPlayer", { id: 2 }, { timeout: 5000 });
```

### 3. NUI Message Listener

**Switch-case** — single listener for all actions:

```ts
import { onNuiMessage } from "@laot/nuix";

const unsub = onNuiMessage<MessageEvents>((action, data) => {
  switch (action) {
    case "showMenu":
      console.log(data.items);
      break;
    case "hideMenu":
      closeMenu();
      break;
  }
});

unsub(); // stop listening
```

**Per-action** — filtered by action, `data` is fully typed:

```ts
const unsub = onNuiMessage<MessageEvents, "showMenu">("showMenu", (data) => {
  console.log(data.items); // ✅ typed as string[]
});
```

### 4. Lua-Style Formatter

```ts
import { luaFormat } from "@laot/nuix";

luaFormat("Hello %s, you are level %d", "Laot", 42);
// → "Hello Laot, you are level 42"

luaFormat("Accuracy: %f%%", 99.5);
// → "Accuracy: 99.5%"
```

### 5. Translator (Global)

Register locales once at runtime (e.g. when Lua sends them), then use `_U` anywhere:

```ts
import { registerLocales, _U, onNuiMessage } from "@laot/nuix";
import type { NuiEventMap, LocaleRecord } from "@laot/nuix";

interface Events extends NuiEventMap {
  setLocales: { data: LocaleRecord; response: void };
  showMenu:   { data: { items: string[] }; response: void };
}

onNuiMessage<Events>((action, data) => {
  switch (action) {
    case "setLocales":
      registerLocales(data);
      break;
    case "showMenu":
      openMenu(data.items);
      break;
  }
});

// Use _U anywhere
_U("ui.greeting", "Hi", "Laot");   // → "Hello Laot!"
_U("ui.level", "Lv.", 42);         // → "Level 42"
_U("missing.key", "Fallback");     // → "Fallback"
```

You can also extend locales incrementally with `extendLocales`:

```ts
import { extendLocales } from "@laot/nuix";

extendLocales({ ui: { subtitle: "Overview" } });
// Merges into existing locales without replacing them
```

### 6. Translator (Isolated)

If you need a separate translator instance with its own locale scope:

```ts
import { createTranslator, mergeLocales } from "@laot/nuix";

const _T = createTranslator({
  locales: {
    greeting: "Hello %s!",
    level: "Level %d",
  },
});

_T("greeting", "MISSING", "Laot"); // → "Hello Laot!"
_T("level", "MISSING", 42);        // → "Level 42"

// Deep-merge multiple locale records
const base = { ui: { greeting: "Hello %s!" } };
const patch = { ui: { greeting: "Hey %s, welcome back!" } };
const merged = mergeLocales(base, patch);
```

### 7. Debug Mode

Enable console logging for every `fetchNui` call:

```ts
const fetchNui = createFetchNui<CallbackEvents>({ debug: true });

await fetchNui("getPlayer", { id: 1 });
// [NUIX] → getPlayer { id: 1 }
// [NUIX] ← getPlayer { name: "Laot", level: 42 }
```

### 8. Mock Data (Local Development)

Return pre-defined responses without real HTTP calls — useful when developing outside FiveM:

```ts
const fetchNui = createFetchNui<CallbackEvents>({
  debug: true,
  mockData: {
    getPlayer: { name: "DevPlayer", level: 99 },
    sendNotify: (data) => {
      console.log("Mock notification:", data.message);
    },
  },
});

const player = await fetchNui("getPlayer", { id: 1 });
// [NUIX] → getPlayer { id: 1 }
// [NUIX] ← getPlayer (mock) { name: "DevPlayer", level: 99 }
```

## Lua Examples

```lua
-- NUI callback (responds to fetchNui calls)
RegisterNUICallback("getPlayer", function(data, cb)
    local player = GetPlayerData(data.id)
    cb({ name = player.name, level = player.level })
end)

-- Send messages to NUI
SendNUIMessage({ action = "showMenu", data = { items = {"Pistol", "Rifle"} } })

-- Send locales to NUI (for registerLocales)
SendNUIMessage({ action = "setLocales", data = Locales })
```

## API Reference

| Export | Type | Description |
|---|---|---|
| `createFetchNui<TMap>(options?)` | Factory | Returns a typed `fetchNui` function (supports debug & mock) |
| `onNuiMessage<TMap>(handler)` | Function | Single listener for all actions (switch-case) |
| `onNuiMessage<TMap, K>(action, handler)` | Function | Per-action listener with typed data |
| `luaFormat(template, ...args)` | Function | Lua-style `%s`/`%d`/`%f` formatter |
| `registerLocales(locales)` | Function | Sets the global locale map at runtime |
| `extendLocales(...records)` | Function | Merges new entries into the global locale map |
| `_U(key, fallback, ...args)` | Function | Global translator — reads from registered locales |
| `createTranslator(options)` | Factory | Returns an isolated translator function |
| `mergeLocales(...records)` | Function | Deep-merges locale records |

## Build

```bash
npm run build      # ESM + CJS + .d.ts
npm run typecheck   # tsc --noEmit
```

## License

MIT
