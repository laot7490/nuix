export type LtBatchMessage = {
	batch?: Record<string, unknown>;
	deletes?: string[];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIndexPatchObject(value: Record<string, unknown>): boolean {
	const keys = Object.keys(value);
	return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
}

function mergeIntoArrayIndex(target: unknown[], indexKey: string, itemPatch: unknown): void {
	const idx = Number(indexKey) - 1;
	if (idx < 0 || Number.isNaN(idx)) return;

	const existing = target[idx];

	if (isPlainObject(itemPatch)) {
		if (isPlainObject(existing)) {
			mergePatch(existing, itemPatch);
		} else {
			target[idx] = itemPatch;
		}
	} else {
		target[idx] = itemPatch;
	}

	if (idx >= target.length) {
		target.length = idx + 1;
	}
}

function applyIndexPatchObject(target: unknown[], patch: Record<string, unknown>): void {
	for (const indexKey of Object.keys(patch)) {
		mergeIntoArrayIndex(target, indexKey, patch[indexKey]);
	}
}

function mergePatch(target: Record<string, unknown>, patch: Record<string, unknown>): void {
	for (const key of Object.keys(patch)) {
		const next = patch[key];
		const current = target[key];

		if (isPlainObject(next) && isIndexPatchObject(next)) {
			if (Array.isArray(current)) {
				applyIndexPatchObject(current, next);
				continue;
			}

			if (current === undefined || current === null) {
				const created: unknown[] = [];
				applyIndexPatchObject(created, next);
				target[key] = created;
				continue;
			}
		}

		if (Array.isArray(next)) {
			target[key] = next;
			continue;
		}

		if (isPlainObject(next) && isPlainObject(current)) {
			mergePatch(current, next);
			continue;
		}

		target[key] = next;
	}
}

function unsetPath(obj: Record<string, unknown>, path: string): void {
	const keys = path.split(".");
	const last = keys.pop();
	if (!last) return;

	let target: unknown = obj;
	for (const segment of keys) {
		if (target == null || typeof target !== "object") return;
		target = (target as Record<string, unknown>)[segment];
	}

	if (target == null || typeof target !== "object") return;

	if (Array.isArray(target) && /^\d+$/.test(last)) {
		const idx = Number(last) - 1;
		if (idx >= 0) delete target[idx];
		return;
	}

	delete (target as Record<string, unknown>)[last];
}

/** Apply LTBridge batch + deletes onto state (keeps JS arrays on partial list patches). */
export function applyLtBatch<T extends object>(target: T, message: LtBatchMessage): T {
	const root = target as Record<string, unknown>;

	if (message.batch) {
		mergePatch(root, message.batch);
	}

	for (const path of message.deletes ?? []) {
		unsetPath(root, path);
	}

	return target;
}

/** Full replace for LTBridge sync/set messages (UpdatePlayer_sync / _set). */
export function replaceLtState<T extends object>(target: T, state: Record<string, unknown>): T {
	const root = target as Record<string, unknown>;
	for (const key of Object.keys(root)) {
		delete root[key];
	}
	Object.assign(root, state);
	return target;
}
