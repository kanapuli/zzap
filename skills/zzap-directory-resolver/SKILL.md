---
name: zzap-directory-resolver
description: Resolve local project or task directories with the zzap JSON CLI. Use when Codex needs to choose a working directory, locate a repo/project from a vague user phrase, avoid broad filesystem searches, disambiguate multiple likely local paths, or record successful agent directory usage without opening the interactive zz picker.
---

# zzap Directory Resolver

Use `zzap`, not `zz`, for agent workflows. `zz` is the human interactive TUI;
`zzap` emits JSON and is safe for non-interactive tool use.

## Core Workflow

1. Resolve likely directories before broad filesystem search:

```sh
zzap query "<project or task phrase>" --json --limit 5
```

2. Use the top result as `workdir` only when it is clearly the intended project.

3. If multiple results are plausible, show a short numbered list and ask the
   user which directory to use.

4. After successful work in a resolved directory, record agent feedback:

```sh
zzap record "<absolute-or-relative-path>" --query "<original query>" --actor agent
```

## Commands

Use `query` for a shortlist:

```sh
zzap query "academic paper" --json --limit 5
```

Use `resolve` only when one best result is enough:

```sh
zzap resolve "academic paper" --json
```

Use `doctor` to confirm availability and store location:

```sh
zzap doctor --json
```

## Interpreting Results

Prefer results with:

- High total `score`.
- Meaningful `displayPath` matching the user's language.
- `source: "history"` for previously selected directories.
- `source: "child"` when the requested directory appears under a known parent.
- Strong `comboScore` when the same query has been learned before.

Treat close scores or semantically different paths as ambiguous. Ask before
running write operations in an uncertain directory.

## Safety Rules

- Do not call `zz` from an agent workflow; it opens the picker.
- Do not record feedback for failed guesses or canceled work.
- Do not run destructive commands in a resolved directory until the path is
  clearly correct.
- Do not scan large home directories before trying `zzap query`.
- Preserve the user's command intent: `zz` is for humans, `zzap` is for agents.

## Example

User request:

```text
Update the README in the academic paper project.
```

Agent flow:

```sh
zzap query "academic paper" --json --limit 5
```

If the top result is `~/academic-research-skills/academic-paper`, use that path
as the command `workdir`. After the README update succeeds:

```sh
zzap record "~/academic-research-skills/academic-paper" --query "academic paper" --actor agent
```
