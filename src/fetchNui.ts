import { getResourceName, isEnvBrowser } from "./env";
import { getNuiMock } from "./mocks";

/**
 * Simple wrapper around the `fetch` API for FiveM NUI callbacks.
 *
 *
 * @template T - Expected response type.
 * @param {string} eventName - The name of the callback event.
 * @param {any} [data] - Optional payload to send to Lua.
 * @param {T} [mockData] - Optional mock data to return if running in a browser environment.
 * @returns {Promise<T>} A promise resolving to the response from the NUI callback, or mock data in browser.
 *
 * @example
 * // Real NUI request
 * const result = await fetchNui<{ success: boolean }>("doSomething", { foo: "bar" });
 *
 * // Browser mock
 * const result = await fetchNui("doSomething", {}, { success: true });
 */
export async function fetchNui<T = unknown>(eventName: string, data?: unknown, mockData?: T): Promise<T> {
	if (isEnvBrowser()) {
		if (mockData !== undefined) {
			return mockData;
		}
		const registered = getNuiMock(eventName);
		if (registered !== undefined) {
			return registered as T;
		}
		throw new Error(
			`[nuix] fetchNui("${eventName}") called in browser without mock. ` +
				`Pass mockData or register via setNuiMocks().`,
		);
	}

	const response = await fetch(`https://${getResourceName()}/${eventName}`, {
		method: "POST",
		headers: { "Content-Type": "application/json; charset=UTF-8" },
		body: JSON.stringify(data ?? {}),
	});

	if (!response.ok) {
		throw new Error(`[nuix] fetchNui("${eventName}") failed with HTTP ${response.status}`);
	}

	return (await response.json()) as T;
}
