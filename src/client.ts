import type { NuiEventMap, FetchNuiOptions, FetchNuiFactoryOptions } from "./types";

// ─── Resource Name ───

/**
 * Grabs the resource name from FiveM's injected global.
 * Falls back to `"nui-frame-app"` when running outside the game (local dev, tests).
 */
function getResourceName(): string {
	if (typeof window !== "undefined" && window.GetParentResourceName) {
		return window.GetParentResourceName();
	}
	return "nui-frame-app";
}

// ─── FetchNui Factory ───

/**
 * Creates a typed `fetchNui` function for your event map.
 * POSTs JSON to `https://<resourceName>/<event>`, matching `RegisterNUICallback` on Lua side.
 *
 * @example
 * ```ts
 * interface MyEvents extends NuiEventMap {
 *   getPlayer: { data: { id: number }; response: { name: string } };
 *   notify:    { data: { msg: string }; response: void };
 * }
 *
 * const fetchNui = createFetchNui<MyEvents>();
 * const player = await fetchNui("getPlayer", { id: 1 });
 *
 * // With mocks + debug
 * const fetchNui = createFetchNui<MyEvents>({
 *   debug: true,
 *   mockData: {
 *     getPlayer: { name: "DevPlayer" },
 *     notify: (data) => { console.log("Mock:", data.msg); },
 *   },
 * });
 * ```
 *
 * Lua side:
 * ```lua
 * RegisterNUICallback("getPlayer", function(data, cb)
 *     local player = GetPlayerData(data.id)
 *     cb({ name = player.name })
 * end)
 * ```
 */
export function createFetchNui<TMap extends NuiEventMap>(factoryOptions?: FetchNuiFactoryOptions<TMap>) {
	const debug = factoryOptions?.debug ?? false;
	const mockData = factoryOptions?.mockData;

	return async function fetchNui<K extends keyof TMap & string>(
		event: K,
		...args: TMap[K]["data"] extends void
			? [data?: TMap[K]["data"], options?: FetchNuiOptions]
			: [data: TMap[K]["data"], options?: FetchNuiOptions]
	): Promise<TMap[K]["response"]> {
		const [data, options] = args;
		if (debug) {
			console.log(`[NUIX] → ${event}`, data ?? {});
		}

		// ─── Mock Mode ───

		if (mockData && event in mockData) {
			const mock = mockData[event];

			if (mock === undefined) {
				throw new Error(`[NUIX] Mock data for "${event}" is undefined`);
			}

			const result =
				typeof mock === "function"
					? (mock as (data: TMap[K]["data"]) => TMap[K]["response"])(data as TMap[K]["data"])
					: mock;

			if (debug) {
				console.log(`[NUIX] ← ${event} (mock)`, result);
			}

			return result as TMap[K]["response"];
		}

		// ─── Real Fetch ───

		const url = `https://${getResourceName()}/${event}`;

		const controller = options?.timeout ? new AbortController() : undefined;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		if (controller && options?.timeout) {
			timeoutId = setTimeout(() => controller.abort(), options.timeout);
		}

		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json; charset=UTF-8" },
				body: JSON.stringify(data ?? {}),
				signal: controller?.signal,
			});

			if (!response.ok) {
				throw new Error(`[NUIX] fetchNui("${event}") failed with HTTP ${response.status}`);
			}

			const result = (await response.json()) as TMap[K]["response"];

			if (debug) {
				console.log(`[NUIX] ← ${event}`, result);
			}

			return result;
		} catch (error) {
			if (error instanceof DOMException && error.name === "AbortError") {
				throw new Error(`[NUIX] fetchNui("${event}") timed out after ${options?.timeout}ms`);
			}
			throw error;
		} finally {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
		}
	};
}
