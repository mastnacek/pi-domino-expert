/**
 * Settings slice for @pi-domino-expert/pi-domino-expert.
 *
 * Registers the project-context and SPAI-007 safety tools. The command-level
 * `set` parsing/completions live in the shared kernel (src/shared/settings.ts)
 * so the commands slice never imports this slice directly.
 *
 * SPAI-007 defenses:
 *   - nativeOracleLaneDisabled: native LS compile oracle lane is OFF by default
 *     (a sandbox panic spawned the installed client's NSD -dumpandkill and killed
 *     the operator's Notes client). Re-enabling requires explicit opt-in.
 *   - sandboxLockEnabled: one-shot worker with sandbox lock (default off).
 *   - lsmRemoved: LSM collision defense — the sandbox lsnotes.ini must NOT be
 *     rewritten so the sandbox Notes runtime never loads the operator's LSM files.
 *
 * Model-facing text stays English.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { PluginState } from "../../shared/state.js";
import { DOMINO_VERSIONS, SERVER_OS, TOPOLOGIES } from "../../shared/settings.js";

const VersionSchema = StringEnum(DOMINO_VERSIONS);
const OsSchema = StringEnum(SERVER_OS);
const TopologySchema = StringEnum(TOPOLOGIES);
const ToggleSchema = StringEnum(["on", "off"] as const);

export function registerSettings(pi: ExtensionAPI, getState: () => PluginState): void {
	pi.registerTool({
		name: "pi_domino_expert_get_settings",
		label: "Domino Expert tool",
		description:
			"Read the active Notes/Domino project context (Domino version, server OS, topology) and SPAI-007 safety toggles. The active context determines version-specific guidance (9.x=Java6, 10.x=Java8, 12.x=Java11+KEEP, 14.x=Java17).",
		parameters: Type.Object({}),
		async execute() {
			const p = getState().project;
			return {
				details: { tool: "get_settings" },
				content: [{
					type: "text",
					text: [
						`dominoVersion: ${p.dominoVersion}`,
						`serverOS: ${p.os}`,
						`topology: ${p.topology}`,
						`SPAI-007 nativeOracleLaneDisabled: ${p.nativeOracleLaneDisabled}`,
						`SPAI-007 sandboxLockEnabled: ${p.sandboxLockEnabled}`,
						`SPAI-007 lsmRemoved: ${p.lsmRemoved}`,
					].join("\n"),
				}],
			};
		},
	});

	pi.registerTool({
		name: "pi_domino_expert_set_settings",
		label: "Domino Expert tool",
		description:
			"Set the Notes/Domino project context or SPAI-007 safety toggles. WARNING: nativeOracleLane=on re-enables the native oracle lane that previously killed the operator's Notes client via NSD -dumpandkill — only disable the protection after explicit operator confirmation.",
		parameters: Type.Object({
			dominoVersion: Type.Optional(VersionSchema),
			os: Type.Optional(OsSchema),
			topology: Type.Optional(TopologySchema),
			nativeOracleLane: Type.Optional(ToggleSchema),
			sandboxLock: Type.Optional(ToggleSchema),
			lsmDefense: Type.Optional(ToggleSchema),
		}),
		async execute(_toolCallId, params) {
			const project = getState().project;
			const applied: string[] = [];

			if (params.dominoVersion) { project.dominoVersion = params.dominoVersion; applied.push(`dominoVersion=${params.dominoVersion}`); }
			if (params.os) { project.os = params.os; applied.push(`os=${params.os}`); }
			if (params.topology) { project.topology = params.topology; applied.push(`topology=${params.topology}`); }

			if (params.nativeOracleLane) {
				project.nativeOracleLaneDisabled = params.nativeOracleLane === "off";
				applied.push(`nativeOracleLane=${params.nativeOracleLane}${project.nativeOracleLaneDisabled ? " (defense ON)" : " (defense OFF — DANGEROUS)"}`);
			}
			if (params.sandboxLock) {
				project.sandboxLockEnabled = params.sandboxLock === "on";
				applied.push(`sandboxLock=${params.sandboxLock}`);
			}
			if (params.lsmDefense) {
				project.lsmRemoved = params.lsmDefense === "on";
				applied.push(`lsmDefense=${params.lsmDefense}`);
			}

			return {
				content: [{
					type: "text",
					text: applied.length > 0
						? `Applied: ${applied.join("; ")}`
						: "No changes requested. Use pi_domino_expert_get_settings to read current values.",
				}],
				details: { tool: "set_settings", applied },
			};
		},
	});
}
