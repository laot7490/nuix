import { getResourceName, isEnvBrowser } from "./env";
import { getNuiMock } from "./mocks";

/**
 * POSTs to a FiveM NUI callback. In the browser, returns mockData or setNuiMocks entry.
 */
export async function fetchNui<T = unknown>(
	eventName: string,
	data?: unknown,
	mockData?: T,
): Promise<T> {
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
