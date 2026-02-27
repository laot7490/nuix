// ─── Event Map ───

/**
 * Extend this to map your NUI event names to their data/response shapes.
 * Both `fetchNui` and `onNuiMessage` use this map for type inference.
 *
 * @example
 * ```ts
 * interface MyEvents extends NuiEventMap {
 *   getPlayer:  { data: { id: number }; response: { name: string; level: number } };
 *   sendNotify: { data: { message: string }; response: void };
 * }
 *
 * // Now fetchNui("getPlayer", { id: 1 }) returns Promise<{ name: string; level: number }>
 * ```
 */
export interface NuiEventMap {
	[event: string]: {
		data: unknown;
		response: unknown;
	};
}

// ─── NUI Message Payload ───

/**
 * The shape Lua sends via `SendNUIMessage`.
 * Every message has an `action` string and a `data` payload.
 *
 * Lua side:
 * ```lua
 * SendNUIMessage({ action = "showMenu", data = { items = {"Pistol", "Rifle"} } })
 * ```
 */
export interface NuiMessagePayload<TData = unknown> {
	action: string;
	data: TData;
}

// ─── FetchNui Options ───

export interface FetchNuiOptions {
	/**
	 * Timeout in ms. If the Lua callback doesn't respond within this window,
	 * the promise rejects with a descriptive timeout error.
	 */
	timeout?: number;
}

// ─── FetchNui Factory Options ───

/**
 * Config for `createFetchNui()`.
 *
 * @example
 * ```ts
 * const fetchNui = createFetchNui<MyEvents>({
 *   debug: true,
 *   mockData: {
 *     getPlayer: { name: "Dev", level: 99 },
 *     sendNotify: (data) => { console.log(data.message); },
 *   },
 * });
 * ```
 */
export interface FetchNuiFactoryOptions<TMap extends NuiEventMap> {
	/** Logs every call and response to the console with `[NUIX]` prefix. */
	debug?: boolean;
	/** Static or dynamic mock responses — when set, no real HTTP call is made. */
	mockData?: {
		[K in keyof TMap]?: TMap[K]["response"] | ((data: TMap[K]["data"]) => TMap[K]["response"]);
	};
}

// ─── Translator ───

/**
 * Flat strings or nested objects. Nested keys use dot-notation (`"ui.greeting"`).
 *
 * @example
 * ```ts
 * const locales: LocaleRecord = {
 *   ui: {
 *     greeting: "Hello %s!",
 *     level: "Level %d",
 *   },
 *   simple_key: "No nesting here",
 * };
 * ```
 */
export type LocaleRecord = {
	[key: string]: string | LocaleRecord;
};

export interface TranslatorOptions {
	/** The locale map — flat or nested. */
	locales: LocaleRecord;
}

/**
 * Translator function signature used by both `createTranslator` and the global `_U`.
 *
 * @param key      Dot-notated key like `"ui.greeting"` or flat like `"title"`
 * @param fallback Returned when the key doesn't exist in the locale map
 * @param args     Format arguments for `%s`, `%d`, `%f` placeholders
 *
 * @example
 * ```ts
 * _U("ui.greeting", "Hi", "Laot"); // → "Hello Laot!"
 * _U("missing.key", "Fallback");   // → "Fallback"
 * ```
 */
export type TranslatorFn = (key: string, fallback: string, ...args: FormatArg[]) => string;

// ─── Formatter ───

/**
 * Types that `luaFormat` accepts as arguments.
 * `null` and `undefined` are handled safely — they won't crash the formatter.
 */
export type FormatArg = string | number | boolean | null | undefined;

// ─── Listener ───

/** Cleanup function — call it to remove the listener. */
export type UnsubscribeFn = () => void;

/** Callback invoked when a matching NUI message arrives. */
export type NuiMessageHandler<TData = unknown> = (data: TData) => void;
