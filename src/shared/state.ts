/**
 * Shared state kernel for @pi-domino-expert/pi-domino-expert.
 * Shared across slices; slices never import each other directly.
 */

import { DEFAULT_LOCALE, type Locale } from "./i18n.js";

export type DominoVersion = "9.x" | "10.x" | "12.x" | "14.x";
export type ServerOS = "Windows" | "Linux" | "AIX" | "Other";
export type ServerTopology = "Standalone" | "Cluster" | "Partitioned" | "HA (Cluster + DR)";

export interface ProjectConfig {
	dominoVersion: DominoVersion;
	os: ServerOS;
	topology: ServerTopology;
	/** SPAI-007: suppress NSD -dumpandkill on sandbox panic (default off). */
	nativeOracleLaneDisabled: boolean;
	/** SPAI-007: one-shot worker with sandbox lock enabled (default off). */
	sandboxLockEnabled: boolean;
	/** SPAI-007: LSM removal applied on start (default off). */
	lsmRemoved: boolean;
}

export interface PluginState {
	enabled: boolean;
	/** UI language; every user-facing string resolves through the i18n table. */
	lang: Locale;
	lastRunTimestamp: number;
	project: ProjectConfig;
}

export function createInitialState(): PluginState {
	return {
		enabled: true,
		lang: DEFAULT_LOCALE,
		lastRunTimestamp: 0,
		project: {
			dominoVersion: "9.x",
			os: "Windows",
			topology: "Standalone",
			nativeOracleLaneDisabled: false,
			sandboxLockEnabled: false,
			lsmRemoved: false,
		},
	};
}