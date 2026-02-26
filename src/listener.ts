import type { NuiEventMap, NuiMessagePayload, NuiMessageHandler, UnsubscribeFn } from "./types";

// ─── NUI Message Listener ───

/**
 * Listens for NUI messages from Lua (`SendNUIMessage`), filtered by action name.
 * Only messages matching the given `action` trigger the handler.
 * Returns a cleanup function to stop listening.
 *
 * @example
 * ```ts
 * interface MyMessages extends NuiEventMap {
 *   showMenu: { request: { items: string[] }; response: void };
 *   hideMenu: { request: void;               response: void };
 * }
 *
 * const unsub = onNuiMessage<MyMessages, "showMenu">("showMenu", (data) => {
 *   console.log(data.items); // typed as string[]
 * });
 *
 * // Stop listening when done
 * unsub();
 * ```
 *
 * Lua side:
 * ```lua
 * SendNUIMessage({ action = "showMenu", data = { items = {"Pistol", "Rifle"} } })
 * ```
 */
export function onNuiMessage<TMap extends NuiEventMap, K extends keyof TMap & string>(
	action: K,
	handler: NuiMessageHandler<TMap[K]["request"]>,
): UnsubscribeFn {
	const listener = (event: MessageEvent<NuiMessagePayload<TMap[K]["request"]>>) => {
		const payload = event.data;

		if (!payload || typeof payload !== "object") return;
		if (payload.action !== action) return;

		handler(payload.data);
	};

	window.addEventListener("message", listener);

	return () => {
		window.removeEventListener("message", listener);
	};
}
