# pi-domino-expert

Notes/Domino Expert assistant plugin for the Pi coding agent — LotusScript,
Formula Language, Java (lotus.domino), XPages and REST/KEEP development and
administration support.

## Features

- **System prompts** (4 modes): `admin` (console commands, notes.ini, rollback
  plans), `dev` (autonomous language selection), `dev-forced` (side-by-side
  language comparison), `error` (root-cause analysis), `review` (security /
  performance / accessibility / maintainability traffic lights).
- **Project context**: Domino version (9.x / 10.x / 12.x / 14.x), server OS,
  topology — drives version-specific guidance (9.x=Java6, 12.x=Java11+KEEP, 14.x=Java17).
- **Local heuristics** (`pi_domino_expert_run_code_heuristics`), all offline:
  - LS-0xd001: `%REM` header must precede `UseLSX` (known 1:1 false positive
    — the parser glues the header onto the UseLSX token stream)
  - lsp_status duplicate-identical-string detection
  - `Option Declare`, `On Error Resume Next`, missing `recycle()` checks
  - SPAI-008 error-code help pages for `d001 / d00a / d019 / d01a / d028 / d06c`
    with IBM message templates and practical examples
- **SAFI-007 defenses** (off by default, explicit opt-in to disable):
  - native oracle lane disabled (a sandbox panic spawned the installed
    client's `NSD -dumpandkill` and killed the operator's Notes client)
  - one-shot worker with sandbox lock
  - LSM collision defense (sandbox `lsnotes.ini` never rewritten)
- **Export** (`pi_domino_expert_export_report`): TXT / WordprocessingML DOCX /
  minimal PDF with project-context front matter, dependency-free.

## Commands

- `/domino-expert status` — plugin status
- `/domino-expert lang en|cs` — UI language
- `/domino-expert set version|os|topology <value>` — project context
- `/domino-expert set safety oracle|sandbox|lsm on|off` — SPAI-007 toggles

## Installation

```json
// ~/.pi/agent/settings.json or .pi/settings.json
{
  "packages": [
    "git:github.com/mastnacek/pi-domino-expert"
  ]
}
```

## Development

```bash
npm install
npm run check   # tsc --noEmit
npm test        # tsc + node --test (8 tests)
```

Layout: Vertical Slice Architecture — thin `index.ts` composition root,
`src/shared/` kernel, `src/slices/<feature>/`. Slices never import each other;
all slices receive a `getState()` getter (never a captured snapshot) per the
stale-config rule.
