/**
 * Shared settings kernel: project context types, SPAI-007 toggles, and the
 * command-level `set` parsing/completions shared by the commands and settings
 * slices. Lives in src/shared/ so slices never import each other.
 */

import type { ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { DominoVersion, ProjectConfig, ServerOS, ServerTopology } from "./state.js";

export const DOMINO_VERSIONS = ["9.x", "10.x", "12.x", "14.x"] as const;
export const SERVER_OS = ["Windows", "Linux", "AIX", "Other"] as const;
export const TOPOLOGIES = ["Standalone", "Cluster", "Partitioned", "HA (Cluster + DR)"] as const;

export interface CompletionRow {
	value: string;
	label: string;
	description: string;
}

/** Completions rows for the `/domino-expert set` subcommand level. */
export function settingsCompletions(prefix: string, project: ProjectConfig): CompletionRow[] | null {
	const text = prefix.trimStart();
	if (!text.startsWith("set")) return null;

	const rest = text.slice("set".length).replace(/^\s+/, "");
	if (rest === "") {
		return [
			{ value: "set version ", label: "version", description: "Domino target version" },
			{ value: "set os ", label: "os", description: "Server operating system" },
			{ value: "set topology ", label: "topology", description: "Server topology" },
			{ value: "set safety ", label: "safety", description: "SPAI-007 defense toggles" },
		];
	}

	const key = rest.split(/\s+/)[0] ?? "";
	const typed = rest.slice(key.length).replace(/^\s+/, "");

	const rowsFor = (candidates: readonly string[], current: string, parent: string) =>
		candidates
			.filter((c) => c.toLowerCase().startsWith(typed.toLowerCase()))
			.map((c) => ({
				value: `set ${parent} ${c}`,
				label: c === current ? `${c} ✓` : c,
				description: `Active: ${current}${c === current ? " · ● AKTIVNÍ" : ""}`,
			}));

	if (key === "version") return rowsFor(DOMINO_VERSIONS, project.dominoVersion, "version");
	if (key === "os") return rowsFor(SERVER_OS, project.os, "os");
	if (key === "topology") return rowsFor(TOPOLOGIES, project.topology, "topology");
	if (key === "safety") {
		if (typed !== "") return null;
		return [
			{ value: "set safety oracle ", label: "oracle", description: project.nativeOracleLaneDisabled ? "defense ON · ● AKTIVNÍ" : "defense OFF" },
			{ value: "set safety sandbox ", label: "sandbox", description: project.sandboxLockEnabled ? "defense ON · ● AKTIVNÍ" : "defense OFF" },
			{ value: "set safety lsm ", label: "lsm", description: project.lsmRemoved ? "defense ON · ● AKTIVNÍ" : "defense OFF" },
		];
	}
	return null;
}

/** Command handler fragment: `set <key> <value>`; returns false if not a `set` command. */
export async function handleSetCommand(
	tokens: string[],
	ctx: ExtensionCommandContext,
	project: ProjectConfig,
): Promise<boolean> {
	if (tokens[0]?.toLowerCase() !== "set") return false;
	const key = tokens[1]?.toLowerCase();
	const value = tokens[2];

	switch (key) {
		case "version":
			if ((DOMINO_VERSIONS as readonly string[]).includes(value ?? "")) {
				project.dominoVersion = value as DominoVersion;
			}
			break;
		case "os":
			if ((SERVER_OS as readonly string[]).includes(value ?? "")) {
				project.os = value as ServerOS;
			}
			break;
		case "topology":
			if ((TOPOLOGIES as readonly string[]).includes(value ?? "")) {
				project.topology = value as ServerTopology;
			}
			break;
		case "safety": {
			const lane = args3(tokens);
			const on = tokens[3]?.toLowerCase() === "on";
			if (lane === "oracle") project.nativeOracleLaneDisabled = !on;
			if (lane === "sandbox") project.sandboxLockEnabled = on;
			if (lane === "lsm") project.lsmRemoved = on;
			break;
		}
		default:
			if (ctx.hasUI) ctx.ui.notify("Usage: set version|os|topology <value> | set safety oracle|sandbox|lsm on|off", "warning");
			return true;
	}
	return true;
}

function args3(tokens: string[]): string {
	return tokens[2]?.toLowerCase() ?? "";
}
