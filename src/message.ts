import type { NuiMessageData } from "./types";

function isNuiMessageData(data: unknown): data is NuiMessageData {
	return typeof data === "object" && data !== null && typeof (data as NuiMessageData).action === "string";
}

/**
 * Listens for flat NUI messages from Lua (SendNUIMessage).
 * @param handler - The handler to call when a message is received.
 * @returns A function to unsubscribe from the message.
 *
 * @example
 * const unsubscribe = onNuiMessage((data) => {
 *   console.log(data.action);
 * });
 *
 * // Unsubscribe
 * unsubscribe();
 */
export function onNuiMessage(handler: (data: NuiMessageData) => void): () => void {
	const listener = (event: MessageEvent) => {
		if (!isNuiMessageData(event.data)) {
			return;
		}
		handler(event.data);
	};

	window.addEventListener("message", listener);
	return () => window.removeEventListener("message", listener);
}

/**
 * Listens for a single action.
 * @param action - The action to listen for.
 * @param handler - The handler to call when the action is received.
 * @returns A function to unsubscribe from the action.
 *
 * @example
 * const unsubscribe = onNuiAction("doSomething", (data) => {
 *   console.log(data);
 * });
 *
 * // Unsubscribe
 * unsubscribe();
 */
export function onNuiAction<A extends string>(action: A, handler: (data: NuiMessageData) => void): () => void {
	return onNuiMessage((data) => {
		if (data.action === action) {
			handler(data);
		}
	});
}
