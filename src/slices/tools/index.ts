/**
 * Tools slice for @pi-domino-expert/pi-domino-expert.
 *
 * Model-facing text (description, result text) stays English in every locale —
 * the agent is the one being instructed. The Multilingual UI invariant exempts it.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { PluginState } from "../../shared/state.js";

const ActionSchema = StringEnum(["status", "ping"] as const);

export function registerTools(pi: ExtensionAPI, getState: () => PluginState): void {
	pi.registerTool({
		name: "_pi_domino_expert_pi_domino_expert_status",
		label: "Domino Expert status",
		description: "Check status of @pi-domino-expert/pi-domino-expert plugin",
		parameters: Type.Object({
			action: ActionSchema,
		}),
		async execute(_toolCallId, params) {
			if (params.action === "status") {
				return {
					content: [{ type: "text", text: "Plugin pi-domino-expert status: OK (enabled=" + getState().enabled + ")" }],
					details: { ok: true },
				};
			}
			return {
				content: [{ type: "text", text: "pong" }],
				details: { ok: true },
			};
		},
	});
}
