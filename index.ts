/**
 * @pi-domino-expert/pi-domino-expert — Pi coding agent extension.
 *
 * Composition root only: registers listeners, wires slices,
 * drains listeners on session_shutdown, and guards against subagent recursion.
 *
 * Stale-config rule (LS-0xd001 family): slices receive a `getState` getter, not
 * a captured snapshot — closures created before session_start must never pin
 * config state, they re-read at call time.
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { createInitialState, type PluginState } from "./src/shared/state.js";
import { stringsFor } from "./src/shared/i18n.js";
import { registerCommands } from "./src/slices/commands/index.js";
import { registerTools } from "./src/slices/tools/index.js";
import { registerHeuristicsTools } from "./src/slices/heuristics/index.js";
import { registerSettings } from "./src/slices/settings/index.js";
import { registerExportTools } from "./src/slices/export/index.js";

/** Subagent recursion guard: avoid duplicating hooks in child sessions. */
function isDelegatedSession(): boolean {
	return process.env.PI_SUBAGENT === "true" || Boolean(process.env.PI_CHILD_SESSION);
}

export default function (pi: ExtensionAPI): void {
	if (isDelegatedSession()) {
		return;
	}

	const state = createInitialState();
	const getState = (): PluginState => state;
	const unsubscribers: Array<() => void> = [];
	const track = (result: unknown): void => {
		if (typeof result === "function") unsubscribers.push(result as () => void);
	};

	// Wire slices — all receive the getter, never a stale captured object.
	registerCommands(pi, getState);
	registerTools(pi, getState);
	registerHeuristicsTools(pi, getState);
	registerSettings(pi, getState);
	registerExportTools(pi, getState);

	track(pi.on("session_start", async (_event, _ctx: ExtensionContext) => {
		const s = stringsFor(state.lang);
		if (_ctx.hasUI) _ctx.ui.setStatus("domino-expert", s.title);
	}));

	// Drain all listeners on session shutdown
	pi.on("session_shutdown", async () => {
		while (unsubscribers.length > 0) {
			unsubscribers.pop()?.();
		}
	});
}
