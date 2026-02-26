# NUIX

> Modular, type-safe TypeScript library for FiveM NUI projects. Zero runtime dependencies.

## Install

```bash
npm install nuix
```

## Quick Start

### 1. Define Your Event Map

```ts
import type { NuiEventMap } from "nuix";

interface MyEvents extends NuiEventMap {
  getPlayer: { request: { id: number }; response: { name: string; level: number } };
  sendNotify: { request: { message: string }; response: void };
}
```

### 2. Typed FetchNui

```ts
import { createFetchNui } from "nuix";

const fetchNui = createFetchNui<MyEvents>();

// Fully typed — request and response inferred from event map
const player = await fetchNui("getPlayer", { id: 1 });
console.log(player.name); // ✅ typed as string

await fetchNui("sendNotify", { message: "Hello!" });

// With timeout (throws descriptive error on timeout)
const data = await fetchNui("getPlayer", { id: 2 }, { timeout: 5000 });
```

### 3. NUI Message Listener

```ts
import { onNuiMessage } from "nuix";

interface MyMessages extends NuiEventMap {
  showMenu: { request: { items: string[] }; response: void };
  hideMenu: { request: void; response: void };
}

const unsub = onNuiMessage<MyMessages, "showMenu">("showMenu", (data) => {
  console.log(data.items); // ✅ typed as string[]
});

// Clean up
unsub();
```

### 4. Lua-Style Formatter

```ts
import { luaFormat } from "nuix";

luaFormat("Hello %s, you are level %d", "Laot", 42);
// → "Hello Laot, you are level 42"

luaFormat("Accuracy: %f%%", 99.5);
// → "Accuracy: 99.5%"
```

### 5. Translator

```ts
import { createTranslator, mergeLocales } from "nuix";

const _U = createTranslator({
  locales: {
    client: {
      greeting: "Hello %s!",
      level: "Level %d",
    },
    server: {
      error: "Error: %s",
    },
    flat_key: "Plain message: %s",
  },
});

_U("client.greeting", "MISSING", "Laot");  // → "Hello Laot!"
_U("client.level", "MISSING", 42);         // → "Level 42"
_U("flat_key", "MISSING", "test");         // → "Plain message: test"
_U("no.key", "Not found");                // → "Not found"

// Deep-merge multiple locale files
const base = { client: { greeting: "Hello %s!" } };
const overrides = { client: { greeting: "Hey %s, welcome back!" } };
const merged = mergeLocales(base, overrides);
const _T = createTranslator({ locales: merged });

_T("client.greeting", "MISSING", "Laot"); // → "Hey Laot, welcome back!"
```

### 6. Debug Mode

Enable console logging for every `fetchNui` call — useful during local development:

```ts
const fetchNui = createFetchNui<MyEvents>({ debug: true });

await fetchNui("getPlayer", { id: 1 });
// Console:
// [NUIX] → getPlayer { id: 1 }
// [NUIX] ← getPlayer { name: "Laot", level: 42 }
```

### 7. Mock Data (Local Development)

When developing outside FiveM, `fetchNui` can return pre-defined mock responses instead of making real HTTP calls:

```ts
const fetchNui = createFetchNui<MyEvents>({
  debug: true,
  mockData: {
    // Static response
    getPlayer: { name: "DevPlayer", level: 99 },

    // Dynamic response based on request
    sendNotify: (req) => {
      console.log("Mock notification:", req.message);
    },
  },
});

const player = await fetchNui("getPlayer", { id: 1 });
// Console: [NUIX] → getPlayer { id: 1 }
// Console: [NUIX] ← getPlayer (mock) { name: "DevPlayer", level: 99 }
// player = { name: "DevPlayer", level: 99 }
```

## Lua Callback Example

```lua
-- client side
RegisterNUICallback("getPlayer", function(data, cb)
    local player = GetPlayerData(data.id)
    cb({ name = player.name, level = player.level })
end)

-- sending messages to NUI
SendNUIMessage({ action = "showMenu", data = { items = {"Pistol", "Rifle"} } })
```

## API Reference

| Export | Type | Description |
|---|---|---|
| `createFetchNui<TMap>(options?)` | Factory | Returns a typed `fetchNui` function (supports debug & mock) |
| `onNuiMessage<TMap, K>(action, handler)` | Function | Listens for NUI messages by action |
| `luaFormat(template, ...args)` | Function | Lua-style `%s`/`%d`/`%f` formatter |
| `createTranslator(options)` | Factory | Returns a `_U` translator function |
| `mergeLocales(...records)` | Function | Deep-merges locale records |

## Build

```bash
npm run build      # ESM + CJS + .d.ts
npm run typecheck   # tsc --noEmit
```

## License

MIT
