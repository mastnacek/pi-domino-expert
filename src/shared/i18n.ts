/**
 * i18n kernel for @pi-domino-expert/pi-domino-expert.
 *
 * One table per locale, one lookup, no runtime dependency, no environment
 * sniffing. Add a locale by adding a row: `LOCALES` drives the command menu and
 * `stringsFor` drives the rendering, so nothing else has to change.
 *
 * Split the strings honestly:
 *   - what the USER reads goes here;
 *   - what the MODEL reads (tool descriptions, tool result text) stays English,
 *     because the agent is the one being instructed.
 */

export const LOCALES = ["en", "cs"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export interface CardStrings {
	/** Slash command help and the statusline prefix. */
	title: string;
	/** Informational message shown with ctx.ui.notify. */
	ready: string;
	/** Answer of the `/status` subcommand. */
	status: (enabled: boolean) => string;
	/** Ask before a destructive action. */
	confirm: string;
	/** Shown after a successful action. */
	done: string;
	/** Completion descriptions for the command menu. */
	langLabel: string;
	setLabel: string;
	statusLabel: string;
}

const STRINGS: Record<Locale, CardStrings> = {
	en: {
		title: "Domino Expert",
		ready: "Domino Expert is ready.",
		status: (enabled) => `Domino Expert is ${enabled ? "enabled" : "muted"}.`,
		confirm: "Do you really want to continue?",
		done: "Done.",
		langLabel: "UI language",
		setLabel: "Project context & SPAI-007 safety toggles",
		statusLabel: "Show plugin status",
	},
	cs: {
		title: "Domino Expert",
		ready: "Domino Expert je připraven.",
		status: (enabled) => `Domino Expert je ${enabled ? "zapnut" : "ztlumen"}.`,
		confirm: "Opravdu chcete pokračovat?",
		done: "Hotovo.",
		langLabel: "Jazyk uživatelského rozhraní",
		setLabel: "Kontext projektu a SPAI-007 bezpečnostní přepínače",
		statusLabel: "Zobrazit stav pluginu",
	},
};

/** The table for a locale; anything unknown falls back to the default. */
export function stringsFor(locale: string | undefined): CardStrings {
	return STRINGS[normalizeLocale(locale)];
}

/** Accept the obvious spellings; a typo is English, never a crash. */
export function normalizeLocale(raw: string | undefined): Locale {
	const token = (raw ?? "").trim().toLowerCase();
	if (token === "cs" || token === "cz" || token === "cze") return "cs";
	return DEFAULT_LOCALE;
}
