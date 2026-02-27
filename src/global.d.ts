export {};

declare global {
	interface Window {
		/** FiveM injected function that returns resource name. */
		GetParentResourceName?: () => string;
		/** FiveM injected native bridge */
		invokeNative?: (...args: unknown[]) => unknown;
	}
}
