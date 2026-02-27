# NUIX

[![npm version](https://img.shields.io/npm/v/@laot/nuix.svg)](https://www.npmjs.com/package/@laot/nuix)
[![license](https://img.shields.io/npm/l/@laot/nuix.svg)](https://github.com/laot7490/nuix/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@laot/nuix)](https://bundlephobia.com/package/@laot/nuix)

A type-safe TypeScript helper library for FiveM NUI development. Wraps the most common NUI patterns — fetching data from Lua, listening for messages, formatting strings, and handling translations — in a clean, fully typed API. Zero runtime dependencies, works with any frontend framework.

---

## Table of Contents

- [Install](#install)
- [Quick Start](#quick-start)
  - [Event Maps](#1-event-maps)
  - [fetchNui](#2-fetchnui--typed-lua-callbacks)
  - [onNuiMessage](#3-onnuimessage--listening-to-lua)
  - [luaFormat](#4-luaformat--string-formatting)
  - [Translator (Global)](#5-translator-global)
  - [Translator (Isolated)](#6-translator-isolated)
  - [Debug Mode](#7-debug-mode)
  - [Mock Data](#8-mock-data-local-development)
- [Lua Side](#lua-side)
- [API Reference](#api-reference)
- [Build](#build)
- [License](#license)

---

## Install

```bash
# pick your package manager
npm install @laot/nuix
pnpm add @laot/nuix
yarn add @laot/nuix
bun add @laot/nuix
```

---

## Quick Start

### 1. Event Maps

Before using anything, you'll want to define your events. NUIX uses these maps to infer the exact types for both data you send and responses you get back. You'll typically have two separate maps:

- **Callback events** — for `fetchNui` calls. Your TS code sends data to Lua, Lua processes it and sends a response back.
- **Message events** — for `onNuiMessage` listeners. Lua pushes data to TS via `SendNUIMessage`, no response needed.

```ts
import type { NuiEventMap } from "@laot/nuix";

// Things you ASK Lua for (request → response)
interface CallbackEvents extends NuiEventMap {
  getPlayer:  { data: { id: number }; response: { name: string; level: number } };
  sendNotify: { data: { message: string }; response: void };
}

// Things Lua TELLS you about (one-way push)
interface MessageEvents extends NuiEventMap {
  showMenu: { data: { items: string[] }; response: void };
  hideMenu: { data: void; response: void };
}
```

> Keeping them separate isn't mandatory, but it makes your code way easier to reason about — you'll always know which events go where.

---

### 2. `fetchNui` — Typed Lua Callbacks

`createFetchNui` gives you a typed function that POSTs JSON to `https://<resourceName>/<event>`, matching `RegisterNUICallback` on the Lua side. The resource name is automatically grabbed from FiveM's `GetParentResourceName()`.

```ts
import { createFetchNui } from "@laot/nuix";

const fetchNui = createFetchNui<CallbackEvents>();

// fully typed — player is { name: string; level: number }
const player = await fetchNui("getPlayer", { id: 1 });
console.log(player.name, player.level);

// void response — you're just notifying Lua, no return value
await fetchNui("sendNotify", { message: "Hello!" });
```

You can also set a **timeout** to avoid hanging forever if the Lua callback never responds:

```ts
const data = await fetchNui("getPlayer", { id: 2 }, { timeout: 5000 });
// rejects with "[NUIX] fetchNui("getPlayer") timed out after 5000ms" if no response
```

---

### 3. `onNuiMessage` — Listening to Lua

Listens for messages from Lua's `SendNUIMessage`. There are two ways to use it:

**Switch-case** — one listener that handles every action:

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

// when you're done listening
unsub();
```

**Per-action** — filters by action name, and `data` is fully typed automatically:

```ts
const unsub = onNuiMessage<MessageEvents, "showMenu">("showMenu", (data) => {
  console.log(data.items); // ✅ typed as string[]
});
```

Both overloads return an `UnsubscribeFn` — just call it to remove the event listener.

---

### 4. `luaFormat` — String Formatting

A small utility that formats strings using Lua-style placeholders. Handles `null` and `undefined` safely instead of crashing.

| Specifier | What it does                         |
|-----------|--------------------------------------|
| `%s`      | String (null/undefined → `""`)       |
| `%d` / `%i` | Integer (floors the value, NaN → `0`) |
| `%f`      | Float (NaN → `0`)                    |
| `%%`      | Literal `%` sign                     |

```ts
import { luaFormat } from "@laot/nuix";

luaFormat("Hello %s, you are level %d", "Laot", 42);
// → "Hello Laot, you are level 42"

luaFormat("Accuracy: %f%%", 99.5);
// → "Accuracy: 99.5%"

luaFormat("Safe: %s %d", undefined, NaN);
// → "Safe:  0"
```

---

### 5. Translator (Global)

A global translation system built on top of `luaFormat`. The idea is simple: Lua sends locale data once (usually on resource start), you register it, and then use `_U()` anywhere in your UI to get translated strings.

**Registration:**

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
      registerLocales(data); // store the locale map globally
      break;
    case "showMenu":
      openMenu(data.items);
      break;
  }
});
```

**Usage — anywhere in your app:**

```ts
// assuming Lua sent: { ui: { greeting: "Hello %s!", level: "Level %d" } }

_U("ui.greeting", "Hi", "Laot");   // → "Hello Laot!"
_U("ui.level", "Lv.", 42);         // → "Level 42"
_U("missing.key", "Fallback");     // → "Fallback" (key not found, returns fallback)
```

**Adding more translations later** without overwriting existing ones:

```ts
import { extendLocales } from "@laot/nuix";

extendLocales({ ui: { subtitle: "Overview" } });
// merges into the existing locale map — won't touch other keys
```

> `_U` uses dot notation. `"ui.greeting"` looks up `locales.ui.greeting` under the hood.

---

### 6. Translator (Isolated)

If you need a translator that's completely independent from the global `_U` — maybe a component with its own locale scope — use `createTranslator`:

```ts
import { createTranslator } from "@laot/nuix";

const _T = createTranslator({
  locales: {
    greeting: "Hello %s!",
    level: "Level %d",
  },
});

_T("greeting", "MISSING", "Laot"); // → "Hello Laot!"
_T("level", "MISSING", 42);        // → "Level 42"
_T("no.key", "Not found");         // → "Not found"
```

There's also `mergeLocales` if you need to deep-merge locale records manually:

```ts
import { mergeLocales } from "@laot/nuix";

const base = { ui: { greeting: "Hello %s!" } };
const patch = { ui: { greeting: "Hey %s, welcome back!" } };

const merged = mergeLocales(base, patch);
// merged.ui.greeting → "Hey %s, welcome back!"
```

---

### 7. Debug Mode

Pass `debug: true` to `createFetchNui` and every call will be logged to the console with the `[NUIX]` prefix. Super useful during development:

```ts
const fetchNui = createFetchNui<CallbackEvents>({ debug: true });

await fetchNui("getPlayer", { id: 1 });
// Console:
// [NUIX] → getPlayer { id: 1 }
// [NUIX] ← getPlayer { name: "Laot", level: 42 }
```

---

### 8. Mock Data (Local Development)

When you're building your UI outside of FiveM (like in a regular browser with `npm run dev`), there's no Lua backend to respond to your `fetchNui` calls. That's where `mockData` comes in — it returns pre-defined responses without making any HTTP requests.

```ts
const fetchNui = createFetchNui<CallbackEvents>({
  debug: true,
  mockData: {
    // static response — just return this object every time
    getPlayer: { name: "DevPlayer", level: 99 },

    // dynamic response — receive the data, return something based on it
    sendNotify: (data) => {
      console.log("Mock notification:", data.message);
    },
  },
});

const player = await fetchNui("getPlayer", { id: 1 });
// Console:
// [NUIX] → getPlayer { id: 1 }
// [NUIX] ← getPlayer (mock) { name: "DevPlayer", level: 99 }
```

> Works great combined with `debug: true` — you can see exactly what's being sent and received in the console.

---

## Lua Side

Here's how the Lua side connects to everything above:

```lua
-- Responds to fetchNui("getPlayer", { id = ... })
RegisterNUICallback("getPlayer", function(data, cb)
    local player = GetPlayerData(data.id)
    cb({ name = player.name, level = player.level })
end)

-- Pushes a message to onNuiMessage listeners
SendNUIMessage({ action = "showMenu", data = { items = {"Pistol", "Rifle"} } })

-- Sends locale data for registerLocales
SendNUIMessage({ action = "setLocales", data = Locales })
```

---

## API Reference

### Functions

| Export | Description |
|---|---|
| `createFetchNui<TMap>(options?)` | Returns a typed `fetchNui` function. Supports `debug` and `mockData` options. |
| `onNuiMessage<TMap>(handler)` | Listens to all NUI messages — use with a switch-case. |
| `onNuiMessage<TMap, K>(action, handler)` | Listens to a single action — `data` is automatically typed. |
| `luaFormat(template, ...args)` | Lua-style string formatter with `%s` / `%d` / `%f` support. |
| `registerLocales(locales)` | Sets the global locale map (replaces the current one). |
| `extendLocales(...records)` | Merges new entries into the existing global locale map. |
| `_U(key, fallback, ...args)` | Global translator — reads from the registered locale map. |
| `createTranslator(options)` | Returns an isolated translator function with its own locale scope. |
| `mergeLocales(...records)` | Deep-merges multiple locale records into one. |

### Types

| Export | Description |
|---|---|
| `NuiEventMap` | Base interface for defining event maps. |
| `NuiMessagePayload<TData>` | Shape of `SendNUIMessage` payloads (`{ action, data }`). |
| `FetchNuiOptions` | Per-call options for `fetchNui` (e.g. `timeout`). |
| `FetchNuiFactoryOptions<TMap>` | Config for `createFetchNui` (`debug`, `mockData`). |
| `LocaleRecord` | Flat or nested string map used for translations. |
| `TranslatorOptions` | Config for `createTranslator`. |
| `TranslatorFn` | Translator function signature (`(key, fallback, ...args) => string`). |
| `FormatArg` | Accepted argument types for `luaFormat` (`string \| number \| boolean \| null \| undefined`). |
| `UnsubscribeFn` | Cleanup function returned by `onNuiMessage`. |
| `NuiMessageHandler<TData>` | Callback type for NUI message listeners. |

---

## Build

```bash
npm run build      # outputs ESM + CJS + .d.ts to dist/
npm run typecheck  # tsc --noEmit
```

Requires Node.js ≥ 18.

---

## License

[MIT](LICENSE) © LAOT
