# NUIX

> Modular, type-safe TypeScript library for FiveM NUI projects. Zero runtime dependencies.

## Install

```bash
npm install @laot/nuix
```

## Quick Start

### 1. Define Your Event Map

```ts
import type { NuiEventMap } from "@laot/nuix";

interface MyEvents extends NuiEventMap {
  getPlayer:  { request: { id: number }; response: { name: string; level: number } };
  sendNotify: { request: { message: string }; response: void };
  showMenu:   { request: { items: string[] }; response: void };
}
```

### 2. Typed FetchNui

```ts
import { createFetchNui } from "@laot/nuix";

const fetchNui = createFetchNui<MyEvents>();

const player = await fetchNui("getPlayer", { id: 1 });
console.log(player.name); // string

await fetchNui("sendNotify", { message: "Hello!" });

// With timeout (throws descriptive error on timeout)
const data = await fetchNui("getPlayer", { id: 2 }, { timeout: 5000 });
```

### 3. NUI Message Listener

**Switch-case** — single listener for all actions:

```ts
import { onNuiMessage } from "@laot/nuix";

const unsub = onNuiMessage<MyEvents>((action, data) => {
  switch (action) {
    case "getPlayer":
      console.log(data.name);
      break;
    case "sendNotify":
      console.log(data.message);
      break;
  }
});

unsub(); // stop listening
```

**Per-action** — filtered by action, `data` is fully typed:

```ts
const unsub = onNuiMessage<MyEvents, "showMenu">("showMenu", (data) => {
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
  setLocales: { request: LocaleRecord; response: void };
  showMenu:   { request: { items: string[] }; response: void };
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
const fetchNui = createFetchNui<MyEvents>({ debug: true });

await fetchNui("getPlayer", { id: 1 });
// [NUIX] → getPlayer { id: 1 }
// [NUIX] ← getPlayer { name: "Laot", level: 42 }
```

### 8. Mock Data (Local Development)

Return pre-defined responses without real HTTP calls — useful when developing outside FiveM:

```ts
const fetchNui = createFetchNui<MyEvents>({
  debug: true,
  mockData: {
    getPlayer: { name: "DevPlayer", level: 99 },
    sendNotify: (req) => {
      console.log("Mock notification:", req.message);
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
