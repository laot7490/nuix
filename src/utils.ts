import type { FormatArg, LocaleRecord, TranslatorFn, TranslatorOptions } from "./types";

// ─── Lua-Style Formatter ───

/**
 * Formats a string using Lua-style placeholders.
 *
 * Specifiers:
 * - `%s` — string (null/undefined becomes empty string)
 * - `%d` — integer (floors the value, NaN becomes 0)
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
 * Creates a `_U(key, fallback, ...args)` translator bound to a locale record.
 *
 * The key supports dot-notation to traverse nested locale objects.
 * If the key isn't found, the fallback string is returned as-is.
 * Any extra args are passed through `luaFormat` for placeholder substitution.
 *
 * @example
 * ```ts
 * const _U = createTranslator({
 *   locales: {
 *     client: {
 *       greeting: "Hello %s!",
 *       level: "Level %d",
 *     },
 *     server: {
 *       error: "Error: %s",
 *     },
 *     flat_key: "Plain message",
 *   },
 * });
 *
 * _U("client.greeting", "MISSING", "Laot");  // → "Hello Laot!"
 * _U("client.level", "MISSING", 42);         // → "Level 42"
 * _U("flat_key", "MISSING");                 // → "Plain message"
 * _U("no.key", "Not found");                 // → "Not found"
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

			if (typeof value === "object" && typeof existing === "object" && existing !== undefined) {
				result[key] = mergeLocales(existing, value);
			} else {
				result[key] = value;
			}
		}
	}

	return result;
}
