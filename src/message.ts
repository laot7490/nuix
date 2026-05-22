import type { NuiMessageData } from "./types";

function isNuiMessageData(data: unknown): data is NuiMessageData {
	return typeof data === "object" && data !== null && typeof (data as NuiMessageData).action === "string";
}

/**
 * Listens for flat NUI messages from Lua (SendNUIMessage).
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
 * Listens for a single action (wraps onNuiMessage).
 */
export function onNuiAction<A extends string>(
	action: A,
	handler: (data: NuiMessageData) => void,
): () => void {
	return onNuiMessage((data) => {
		if (data.action === action) {
			handler(data);
		}
	});
}
