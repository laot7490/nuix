/**
 * Flat payload from Lua `SendNUIMessage` (e.g. LT.NUI.CreateState).
 * Add your own fields in the handler or extend this interface in your project.
 */
export interface NuiMessageData {
	action: string;
	namespace?: string;
	batch?: Record<string, unknown>;
	deletes?: string[];
	state?: Record<string, unknown>;
	locale?: string;
	translations?: Record<string, string>;
}
