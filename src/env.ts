let resourceOverride: string | null = null;

/**
 * Returns true when running outside FiveM (no invokeNative bridge).
 */
export function isEnvBrowser(): boolean {
	return typeof window !== "undefined" && typeof (window as Window & { invokeNative?: unknown }).invokeNative === "undefined";
}

/**
 * Overrides the resource name used by fetchNui (useful in Vite/browser dev).
 */
export function setResourceName(name: string): void {
	resourceOverride = name;
}

/**
 * Resource name for NUI callback URLs.
 */
export function getResourceName(): string {
	if (resourceOverride) {
		return resourceOverride;
	}
	if (typeof window !== "undefined" && window.GetParentResourceName) {
		return window.GetParentResourceName();
	}
	return "nui-frame-app";
}
