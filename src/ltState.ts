import { onNuiMessage } from "./message";
import { applyLtBatch, replaceLtState } from "./ltBatch";
import type { NuiMessageData } from "./types";

/**
 * Bind LTBridge CreateState messages to a mutable state object (e.g. Pinia `$state`).
 * Handles `action`, `action_sync`, and `action_set`.
 *
 * @example
 * import { defineStore } from "pinia";
 * import { bindLtState } from "@laot/nuix";
 *
 * export const usePlayerStore = defineStore("player", {
 *   state: () => ({
 *     hud: { health: 100, armor: 100 },
 *   }),
 * });
 *
 * const store = usePlayerStore();
 * bindLtState("UpdatePlayer", store.$state);
 */
export function bindLtState<T extends object>(action: string, target: T): () => void {
	const syncAction = `${action}_sync`;
	const setAction = `${action}_set`;

	return onNuiMessage((data: NuiMessageData) => {
		if (data.action === action) {
			applyLtBatch(target, data);
			return;
		}

		if (data.action === syncAction || data.action === setAction) {
			replaceLtState(target, data.state ?? {});
		}
	});
}
