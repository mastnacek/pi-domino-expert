# pi-domino-expert — Decision Record (2026-10-24)

## Binding rules from task memory (enforced in code)

1. **LS-0xd001** — 1:1 false positive = UseLSX glue onto `%REM` header.
   Detector: `src/slices/heuristics/index.ts` → `checkLsxHeader()`.
   Report when `%REM` is missing or appears AFTER `UseLSX`.
   Fix text: header first, blank line, then `UseLSX`.
   Also: `lsp_status` dup-string detector (`checkLspStatusDup()`), and the
   **stale-config closure rule** — NEVER capture `state.config` in a closure
   created before `session_start`; all slices receive `getState()` getters.

2. **SAFETY (SPAI-007)** — native oracle lane disabled by default
   (`nativeOracleLaneDisabled: true` default? NO — see state.ts: defense flag
   semantics: `nativeOracleLaneDisabled` records the defense; default state is
   defense OFF but lane described as dangerous; re-enabling the lane prints a
   DANGEROUS warning). Reason: a sandbox panic spawned the installed client's
   `NSD -dumpandkill` and killed the operator's Notes client.
   Toggles: `/domino-expert set safety oracle|sandbox|lsm on|off`.
   LS error-code help pages (d001/d00a/d019/d01a/d028/d06c) with IBM templates
   embedded in `LS_ERROR_HELP` (SPAI-008 deliverable).

3. **SPAI-008 automation lane** — auto-explain + auto-format map to the
   heuristics help pages; export lane produces TXT/DOCX/PDF with environment
   front matter (`src/slices/export/index.ts`).

## Engine contract gotchas (pi-coding-agent 1.4.0)

- `pi.registerTool` REQUIRES `label` (human-readable UI label).
- Tool execute returns REQUIRE `details` (AgentToolResult<TDetails>).
- execute signature: `(toolCallId, params, signal, onUpdate, ctx)`.
- Scaffold bug: slice-internal imports must be `../../shared/...`, not
  `../shared/...` (the isolation checker treats `slices/shared/` as a slice).
- `npm view @earendil-works/pi-coding-agent version` = 1.4.0; installed 1.3.0
  → installed deps pinned to 1.3.0 but types compiled against local node_modules.

## Verification

- `npm run check` → tsc --noEmit clean
- `npm test` → 8/8 pass
- Smoke test: BAD case (UseLSX before %REM + dup status) → 2 findings;
  GOOD case → clean; all 6 error-code help pages render.
