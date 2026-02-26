import type { FormatArg, LocaleRecord, TranslatorFn, TranslatorOptions } from "./types";

// ─── Lua-Style Formatter ───

/**
 * Formats a string using Lua-style placeholders.
 *
 * Specifiers:
 * - `%s` — string (null/undefined becomes empty string)
 * - `%d` / `%i` — integer (floors the value, NaN becomes 0)
 * - `%f` — float (NaN becomes 0)
 * - `%%` — literal percent sign
 *
 * @example
 * ```ts
 * luaFormat("Hello %s, you are level %d", "Laot", 42);
 * // → "Hello Laot, you are level 42"
 *
 * luaFormat("Accuracy: %f%%", 99.5);
 * // → "Accuracy: 99.5%"
 *
 * luaFormat("Safe: %s %d", undefined, NaN);
 * // → "Safe:  0"
 * ```
 */
export function luaFormat(template: string, ...args: FormatArg[]): string {
	let argIndex = 0;

	return template.replace(/%([sdfi%])/g, (match, specifier: string) => {
		if (specifier === "%") return "%";

		const raw = args[argIndex++];

		switch (specifier) {
			case "s":
				return String(raw ?? "");

			case "d":
			case "i": {
				const num = Number(raw);
				return String(Number.isNaN(num) ? 0 : Math.floor(num));
			}

			case "f": {
				const num = Number(raw);
				return String(Number.isNaN(num) ? 0 : num);
			}

			default:
				return match;
		}
	});
}

// ─── Dot-Notation Resolver ───

/**
 * Walks a nested locale object by splitting the key on `.`
 * Returns the string value at the end of the path, or `undefined` if any segment is missing.
 *
 * `"client.greeting"` → looks up `locales.client.greeting`
 * `"flat_key"` → looks up `locales.flat_key` directly
 */
function resolveKey(locales: LocaleRecord, key: string): string | undefined {
	const segments = key.split(".");
	let current: LocaleRecord | string = locales;

	for (const segment of segments) {
		if (typeof current !== "object" || current === null) return undefined;
		const next: string | LocaleRecord | undefined = current[segment];
		if (next === undefined) return undefined;
		current = next;
	}

	return typeof current === "string" ? current : undefined;
}

// ─── Translator Factory ───

/**
 * Creates an isolated translator bound to a specific locale record.
 * Use this when you need a separate translator instance, independent of the global `_U`.
 *
 * @example
 * ```ts
 * const _T = createTranslator({
 *   locales: {
 *     greeting: "Hello %s!",
 *     level: "Level %d",
 *   },
 * });
 *
 * _T("greeting", "MISSING", "Laot"); // → "Hello Laot!"
 * _T("level", "MISSING", 42);        // → "Level 42"
 * _T("no.key", "Not found");         // → "Not found"
 * ```
 */
export function createTranslator(options: TranslatorOptions): TranslatorFn {
	const { locales } = options;

	return (key: string, fallback: string, ...args: FormatArg[]): string => {
		const template = resolveKey(locales, key);

		if (template === undefined) {
			return fallback;
		}

		return args.length > 0 ? luaFormat(template, ...args) : template;
	};
}

// ─── Global Locale Registry ───

let _locales: LocaleRecord = {};

/**
 * Sets the global locale map. Call this when Lua sends locale data to the NUI.
 *
 * @example
 * ```ts
 * // Lua side:
 * // SendNUIMessage({ action = "setLocales", data = locales })
 *
 * onNuiMessage<Events>((action, data) => {
 *   switch (action) {
 *     case "setLocales":
 *       registerLocales(data);
 *       break;
 *   }
 * });
 * ```
 */
export function registerLocales(locales: LocaleRecord): void {
	_locales = locales;
}

/**
 * Merges new entries into the current global locale map without replacing it.
 *
 * @example
 * ```ts
 * registerLocales({ ui: { title: "Dashboard" } });
 * extendLocales({ ui: { subtitle: "Overview" } });
 *
 * _U("ui.title", "");    // → "Dashboard"
 * _U("ui.subtitle", ""); // → "Overview"
 * ```
 */
export function extendLocales(...records: LocaleRecord[]): void {
	_locales = mergeLocales(_locales, ...records);
}

/**
 * Global translator — reads from the locale map set by `registerLocales` / `extendLocales`.
 *
 * @param key      Dot-notated key, e.g. `"ui.greeting"` or flat `"title"`
 * @param fallback Returned as-is when the key doesn't exist
 * @param args     Values for `%s`, `%d`, `%f` placeholders
 *
 * @example
 * ```ts
 * import { registerLocales, _U } from "@laot/nuix";
 *
 * // After Lua sends locales:
 * // { ui: { greeting: "Hello %s!", level: "Level %d" } }
 *
 * _U("ui.greeting", "Hi", "Laot"); // → "Hello Laot!"
 * _U("ui.level", "Lv.", 42);       // → "Level 42"
 * _U("missing.key", "Fallback");   // → "Fallback"
 * ```
 */
export function _U(key: string, fallback: string, ...args: FormatArg[]): string {
	const template = resolveKey(_locales, key);
	if (template === undefined) return fallback;
	return args.length > 0 ? luaFormat(template, ...args) : template;
}

// ─── Deep Merge ───

/**
 * Deep-merges multiple locale records into one.
 * Later records override earlier ones on key conflicts.
 * Nested objects are merged recursively, not replaced entirely.
 *
 * @example
 * ```ts
 * const base = { client: { greeting: "Hello %s!", level: "Level %d" } };
 * const overrides = { client: { greeting: "Hey %s!" } };
 *
 * const merged = mergeLocales(base, overrides);
 * // merged.client.greeting → "Hey %s!"
 * // merged.client.level    → "Level %d" (preserved from base)
 * ```
 */
export function mergeLocales(...records: LocaleRecord[]): LocaleRecord {
	const result: LocaleRecord = {};

	for (const record of records) {
		for (const [key, value] of Object.entries(record)) {
			const existing = result[key];

			if (
				value !== null &&
				existing !== null &&
				typeof value === "object" &&
				typeof existing === "object" &&
				existing !== undefined
			) {
				result[key] = mergeLocales(existing, value);
			} else {
				result[key] = value;
			}
		}
	}

	return result;
}
