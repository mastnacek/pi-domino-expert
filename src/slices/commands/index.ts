/**
 * Commands slice for @pi-domino-expert/pi-domino-expert.
 *
 * Every string the user reads comes from the string table, so the same source
 * serves every locale. `lang` and `set` are non-terminal subcommands: they open
 * their own value level (Trailing Space Contract, references/command-completions.md).
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { LOCALES, normalizeLocale, stringsFor } from "../../shared/i18n.js";
import type { PluginState } from "../../shared/state.js";
import { handleSetCommand, settingsCompletions } from "../../shared/settings.js";

export function registerCommands(pi: ExtensionAPI, getState: () => PluginState): void {
	pi.registerCommand("domino-expert", {
		// The description is user-facing, so it resolves at completion time from
		// the table instead of being frozen into the registration.
		getArgumentCompletions: (prefix: string) => completions(prefix, getState()),
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			const state = getState();
			const s = stringsFor(state.lang);
			const tokens = args.trim().split(/\s+/).filter(Boolean);
			const sub = (tokens[0] ?? "status").toLowerCase();

			if (sub === "lang") {
				const requested = tokens[1]?.toLowerCase();
				if (!requested || !(LOCALES as readonly string[]).includes(requested)) {
					if (ctx.hasUI) {
						ctx.ui.notify(
							`Usage: /domino-expert lang <${LOCALES.join("|")}>`,
							"warning",
						);
					}
					return;
				}
				state.lang = normalizeLocale(requested);
				if (ctx.hasUI) ctx.ui.notify(`${s.title}: ${state.lang}`, "info");
				return;
			}

			if (await handleSetCommand(tokens, ctx, getState().project)) return;

			if (!ctx.hasUI) return;
			ctx.ui.notify(s.status(state.enabled), "info");
		},
	});
}

/** `lang ` and `set ` are non-terminal: they offer their value levels. */
function completions(prefix: string, state: PluginState): { value: string; label: string; description: string }[] | null {
	const text = prefix.trimStart();
	const head = text.split(/\s+/)[0]?.toLowerCase() ?? "";

	if (head === "lang") {
		const typed = text.slice("lang".length).trim().toLowerCase();
		const rows = LOCALES.map((locale) => ({
			value: `lang ${locale}`,
			label: state.lang === locale ? `${locale} ✓` : locale,
			description: `UI language${state.lang === locale ? " · ● AKTIVNÍ" : ""}`,
		})).filter((row) => row.value.toLowerCase().startsWith(`lang ${typed}`));
		return rows.length > 0 ? rows : null;
	}

	const setRows = settingsCompletions(text, state.project);
	if (setRows) return setRows;

	if (head !== "" && !"lang".startsWith(head) && !"set".startsWith(head) && !"status".startsWith(head)) return null;
	return [
		{ value: "lang ", label: "lang", description: stringsFor(state.lang).langLabel },
		{ value: "set ", label: "set", description: stringsFor(state.lang).setLabel },
		{ value: "status", label: "status", description: stringsFor(state.lang).statusLabel },
	];
}
