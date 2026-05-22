const nuiMocks: Record<string, unknown> = {};

/**
 * Registers mock responses for fetchNui in the browser (local dev).
 */
export function setNuiMocks(mocks: Record<string, unknown>): void {
	for (const [event, value] of Object.entries(mocks)) {
		nuiMocks[event] = value;
	}
}

/** Clears all registered NUI mocks. */
export function clearNuiMocks(): void {
	for (const key of Object.keys(nuiMocks)) {
		delete nuiMocks[key];
	}
}

/** @internal */
export function getNuiMock(eventName: string): unknown | undefined {
	if (Object.prototype.hasOwnProperty.call(nuiMocks, eventName)) {
		return nuiMocks[eventName];
	}
	return undefined;
}
