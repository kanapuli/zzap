# Agent Instructions

Use this file when an AI coding agent works on `zzap`.

## Project Shape

- `zz` is the human interactive directory jumper.
- `zzap` is the agent-native JSON CLI.
- Core ranking and storage logic lives in `src/` and should stay reusable by
  both CLIs.
- Agent usage docs live in `docs/`.
- Reusable agent skills live in `skills/`.

## Commands

Run these before reporting completion for code changes:

```sh
npm run check
npm test
```

Use this when package contents change:

```sh
npm_config_cache=/private/tmp/zzap-npm-cache npm pack --dry-run
```

Use this to smoke-test the agent CLI:

```sh
zzap doctor --json
zzap query "academic paper" --json --limit 5
```

## Coding Rules

- Use strict TypeScript.
- Keep runtime dependencies at zero unless there is a strong reason.
- Prefer functional modules and named exports.
- Keep `zz` interactive behavior separate from `zzap` JSON behavior.
- Do not let agent feedback unexpectedly change human `zz` ranking behavior.
- Keep test fixtures path-independent; temporary directory names can affect fuzzy
  ranking.

## Git Workflow

- Do not commit unless the user explicitly asks.
- Use focused commits with descriptive subject and body.
- Do not amend commits unless explicitly requested.
- Do not revert user changes without explicit permission.

## User-Facing Behavior

- `zz <query>` must keep opening the picker.
- `zzap <command>` must stay non-interactive and JSON-oriented.
- Shell integration must remain necessary for changing the parent shell
  directory.
- README should stay concise and product-oriented; detailed explanations belong
  in `docs/`.
