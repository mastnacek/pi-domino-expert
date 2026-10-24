/**
 * Heuristics slice for @pi-domino-expert/pi-domino-expert.
 *
 * Memory rules enforced here:
 *   - LS-0xd001: 1:1 false positive = UseLSX glue onto %REM header (header must
 *     precede UseLSX); lsp_status dup-string detection.
 *   - Compile-tool stale config: NEVER capture state.config in a closure created
 *     before session_start — tools receive config via getter functions instead.
 *   - SPAI-008: LS error-code help pages (d001/d00a/d019/d01a/d028/d06c) with
 *     IBM message template + practical examples.
 *   - SAFETY: native oracle lane awareness (d028/d019 did-you-mean context).
 *
 * Model-facing text stays English.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import type { PluginState } from "../../shared/state.js";

const LSErrorCode = StringEnum(["d001", "d00a", "d019", "d01a", "d028", "d06c"] as const);
const FixType = StringEnum(["lsx-header", "lsp-status-dup", "all"] as const);

/** SPAI-008: IBM-style help page template for observed LS error codes. */
const LS_ERROR_HELP: Record<string, string> = {
	d001: `**LS-0xd001 — "Variable already declared" / UseLSX glue false positive**
IBM message template: "Duplicate definition: <symbol>" (hex 0xd001)
Root cause: Known 1:1 false positive — the %REM header block glues onto the
first UseLSX line in the parsed token stream, so the LSX-provided symbol is
reported as a duplicate declaration.
Fix: Ensure the %REM ... %END REM header block physically precedes any
UseLSX statement, with a blank line between them.
Example:
    %REM
      Module: agent.lss
    %END REM

    UseLSX "*lsxlib"

    Sub Initialize
    End Sub`,
	d00a: `**LS-0xd00a — "Type mismatch in expression"**
IBM message template: "Type mismatch in expression: <expr>" (hex 0xd00a)
Root cause: Variant coercion across incompatible underlying types, most often
a NotesDocument field read (returns Variant) used directly in arithmetic.
Fix: Cast explicitly with CInt/CLng/CDbl/Str before use.
Example:
    Dim count As Integer
    count = CInt(doc.FieldValue(0))`,
	d019: `**LS-0xd019 — "Object variable does not refer to a valid object"**
IBM message template: "Object variable does not refer to a valid object" (hex 0xd019)
Root cause: Using a Notes backend object after recycle() or after the parent
session went out of scope. Also the SAFETY lane gate: never spawn the native
oracle (NSD) from sandbox code — a panic path invoking NSD -dumpandkill will
kill the operator's installed Notes client.
Fix: Re-acquire the object from its parent (session/database) before use;
defer recycle() to a finally block.
Example:
    Dim doc As NotesDocument
    Set doc = db.GetDocumentByID(docID) ' re-acquire, do not reuse recycled ref`,
	d01a: `**LS-0xd01a — "Entry not found in index"**
IBM message template: "Entry not found in index" (hex 0xd01a)
Root cause: NotesView.GetDocumentByKey / GetEntryByKey miss because the key
case/sort order does not match the view's sorted column, or the view index is
stale.
Fix: Pass exact key matching the sorted column; consider refresh or
GetDocumentByKey(key, True) for prefix match.
Example:
    Set doc = view.GetDocumentByKey(key, True) ' prefix match`,
	d028: `**LS-0xd028 — "Illegal function call" (SAFETY-flagged)**
IBM message template: "Illegal function call: <call>" (hex 0xd028)
Root cause: Argument out of domain or call made in an unsupported context.
SAFETY note: this code is common on the disabled-by-default native oracle
lane — if you see it alongside NSD activity, treat the environment as
compromised (sandbox panic path must NOT invoke NSD -dumpandkill against the
installed client).
Fix: Validate ranges before the call; did-you-mean: check spelling against
the Designer Help index for the class member.
Example:
    If idx >= 0 And idx <= Ubound(arr) Then value = arr(idx)`,
	d06c: `**LS-0xd06c — "Note item not found"**
IBM message template: "Note item not found: <item>" (hex 0xd06c)
Root cause: Document.GetItemValue on an item that was never written, or item
name case mismatch on a design element read.
Fix: Guard with HasItem before GetItemValue; verify exact item name in
Designer.
Example:
    If doc.HasItem("Status") Then v = doc.GetItemValue("Status")`,
};

/** LS-0xd001: %REM header must precede UseLSX with a separating blank line. */
function checkLsxHeader(code: string): string | null {
	if (!/\bUseLSX\b/.test(code)) return null;
	const remIdx = code.search(/%REM\b/i);
	const lsxIdx = code.search(/\bUseLSX\b/);
	if (remIdx === -1 || remIdx > lsxIdx) {
		return [
			"**LS-0xd001 %REM header / UseLSX glue (known 1:1 false positive):**",
			"Problem: UseLSX appears before (or without) a %REM header. The parser glues",
			"the %REM block onto the UseLSX token stream and reports a duplicate symbol.",
			"Fix: put the %REM ... %END REM header FIRST, then UseLSX, separated by a",
			"blank line:",
			"```lotusscript",
			"%REM",
			"  Module header...",
			"%END REM",
			"",
			`UseLSX "*lsxlib"`,
			"```",
		].join("\n");
	}
	return null;
}

/** LS-0xd001: lsp_status duplicate identical string assignment. */
function checkLspStatusDup(code: string): string | null {
	const assigns = code.match(/\b(lsp_)?status\s*=\s*["']([^"']*)["']/gi);
	if (!assigns || assigns.length < 2) return null;
	const values = assigns
		.map((m) => (m.match(/["']([^"']*)["']/)?.[1] ?? ""))
		.filter((v) => v.length > 0);
	const seen = new Set<string>();
	for (const v of values) {
		if (seen.has(v)) {
			return [
				"**lsp_status dup-string:**",
				`Duplicate identical assignment detected: \`status = "${v}"\` appears more than once.`,
				"The domino-lsp 2.0.0 status pipeline keys on these strings; duplicates",
				"collapse distinct states. Fix: give each state a unique string, or reuse",
				"the variable instead of re-assigning the same literal.",
			].join("\n");
		}
		seen.add(v);
	}
	return null;
}

/** Generic anti-pattern checks for LotusScript. */
function checkAntiPatterns(code: string): string[] {
	const out: string[] = [];
	const hasDim = /\bDim\b/i.test(code);
	if (hasDim && !/\bOption\s+(Declare|Explicit)\b/i.test(code)) {
		out.push("**Recommendation:** add `Option Declare` at the top of the module for compile-time type checking.");
	}
	if (/On\s+Error\s+Resume\s+Next/i.test(code)) {
		out.push("**Anti-pattern:** `On Error Resume Next` swallows all errors. Use `On Error Goto <handler>` with cleanup in the handler.");
	}
	const javaNoRecycle = /new\s+lotus\.domino\./i.test(code) && !/recycle\s*\(\s*\)/i.test(code);
	if (javaNoRecycle) {
		out.push("**Java gotcha:** backend objects created without recycle() leak memory in server-side agents. Call recycle() in a finally block.");
	}
	return out;
}

export function registerHeuristicsTools(pi: ExtensionAPI, _getState: () => PluginState): void {
	pi.registerTool({
		name: "pi_domino_expert_run_code_heuristics",
		label: "Domino Expert tool",
		description:
			"Run local (offline) heuristics on LotusScript code: LS-0xd001 UseLSX/%REM header false positive, lsp_status duplicate-string, Option Declare, On Error misuse, missing recycle(), and SPAI-008 error-code help (d001/d00a/d019/d01a/d028/d06c) with IBM templates.",
		parameters: Type.Object({
			code: Type.String({ description: "LotusScript source to analyze" }),
			fixes: Type.Optional(FixType),
			errorCode: Type.Optional(LSErrorCode),
		}),
		async execute(_toolCallId, params) {
			const results: string[] = [];
			const code = params.code;
			const fixes = params.fixes ?? "all";

			if (fixes === "lsx-header" || fixes === "all") {
				const r = checkLsxHeader(code);
				if (r) results.push(r);
			}
			if (fixes === "lsp-status-dup" || fixes === "all") {
				const r = checkLspStatusDup(code);
				if (r) results.push(r);
			}

			results.push(...checkAntiPatterns(code));

			if (params.errorCode) {
				const help = LS_ERROR_HELP[params.errorCode];
				if (help) results.push(help);
			}

			return {
				content: [{
					type: "text",
					text: results.length > 0
						? results.join("\n\n")
						: "No issues detected by local heuristics. This does not replace a compile check — use the compile tool for definitive diagnostics.",
				}],
				details: { findings: results.length, offline: true },
			};
		},
	});
}
