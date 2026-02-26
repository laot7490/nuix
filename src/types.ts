// ─── Event Map ───

/**
 * Extend this to map your NUI callback names to their request/response shapes.
 * Both `fetchNui` and `onNuiMessage` use this map for full type inference.
 *
 * @example
 * ```ts
 * interface MyEvents extends NuiEventMap {
 *   getPlayer:  { request: { id: number }; response: { name: string; level: number } };
 *   sendNotify: { request: { message: string }; response: void };
 * }
 *
 * // Now fetchNui("getPlayer", { id: 1 }) returns Promise<{ name: string; level: number }>
 * ```
 */
export interface NuiEventMap {
	[event: string]: {
		request: unknown;
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
 * Options passed to `createFetchNui()` at factory level.
 *
 * @example
 * ```ts
 * const fetchNui = createFetchNui<MyEvents>({
 *   debug: true,
 *   mockData: {
 *     getPlayer: { name: "Dev", level: 99 },
 *     sendNotify: (req) => { console.log(req.message); },
 *   },
 * });
 * ```
 */
export interface FetchNuiFactoryOptions<TMap extends NuiEventMap> {
	/** Logs every `fetchNui` call and response to the console with `[NUIX]` prefix. */
	debug?: boolean;
	/**
	 * Mock responses for local development outside FiveM.
	 * Can be a static value or a function that receives the request and returns the response.
	 * When a mock exists for an event, no HTTP call is made.
	 */
	mockData?: {
		[K in keyof TMap]?: TMap[K]["response"] | ((request: TMap[K]["request"]) => TMap[K]["response"]);
	};
}

// ─── Translator ───

/**
 * Locale record — can be flat strings or nested objects.
 * Nested keys are accessed via dot-notation in the translator.
 *
 * @example
 * ```ts
 * const locales: LocaleRecord = {
 *   client: {
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
	/** The locale map. Same structure as `LocaleRecord` — flat or nested. */
	locales: LocaleRecord;
}

/**
 * Translator function returned by `createTranslator`.
 *
 * @param key      - Dot-notated key like `'client.greeting'` or flat like `'title'`
 * @param fallback - Returned when the key doesn't exist in the locale map
 * @param args     - Format arguments for `%s`, `%d`, `%f` placeholders
 *
 * @example
 * ```ts
 * _U("client.greeting", "MISSING", "Laot");  // → "Hello Laot!"
 * _U("no.key", "Not found");                 // → "Not found"
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
