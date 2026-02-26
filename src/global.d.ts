export {};

declare global {
	interface Window {
		/** FiveM injected function that returns the parent resource name. */
		GetParentResourceName: () => string;
	}
}
