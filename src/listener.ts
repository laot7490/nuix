import type { NuiEventMap, NuiMessagePayload, NuiMessageHandler, UnsubscribeFn } from "./types";

// ─── NUI Message Listener ───

/**
 * Listens for NUI messages from Lua (`SendNUIMessage`).
 *
 * **Per-action** — filters by action name, `data` is fully typed:
 * ```ts
 * onNuiMessage<Events, "showMenu">("showMenu", (data) => {
 *   console.log(data.items); // ✅ typed as string[]
 * });
 * ```
 *
 * **Switch-case** — single listener for all actions:
 * ```ts
 * onNuiMessage<Events>((action, data) => {
 *   switch (action) {
 *     case "setLocales":
 *       registerLocales(data);
 *       break;
 *     case "showMenu":
 *       openMenu(data.items);
 *       break;
 *   }
 * });
 * ```
 *
 * Lua side:
 * ```lua
 * SendNUIMessage({ action = "showMenu", data = { items = {"Pistol", "Rifle"} } })
 * ```
 */

// Per-action overload
export function onNuiMessage<TMap extends NuiEventMap, K extends keyof TMap & string>(
	action: K,
	handler: NuiMessageHandler<TMap[K]["request"]>,
): UnsubscribeFn;

// Switch-case overload
export function onNuiMessage<TMap extends NuiEventMap>(
	handler: (action: keyof TMap & string, data: any) => void,
): UnsubscribeFn;

// Implementation
export function onNuiMessage(
	actionOrHandler: string | ((action: string, data: unknown) => void),
	handler?: (data: unknown) => void,
): UnsubscribeFn {
	const listener = (event: MessageEvent<NuiMessagePayload>) => {
		const payload = event.data;

		if (!payload || typeof payload !== "object") return;
		if (!payload.action) return;

		if (typeof actionOrHandler === "string") {
			if (payload.action !== actionOrHandler) return;
			handler!(payload.data);
		} else {
			actionOrHandler(payload.action, payload.data);
		}
	};

	window.addEventListener("message", listener);

	return () => {
		window.removeEventListener("message", listener);
	};
}
