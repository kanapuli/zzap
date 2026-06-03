# Agent Skills

`zzap` ships a reusable skill that teaches agents how to resolve local project
directories with the `zzap` JSON CLI.

The skill is stored at:

```text
skills/zzap-directory-resolver/
```

It is intended for people who use `zzap` in their own projects, not only for
agents working on the `zzap` repository.

## Codex

Install the skill into your personal Codex skills directory:

```sh
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/zzap-directory-resolver "${CODEX_HOME:-$HOME/.codex}/skills/"
```

After installation, ask Codex to use the skill when a task needs a local project
directory:

```text
Use the zzap-directory-resolver skill to find the academic paper project.
```

## Claude Code

Claude Code supports personal skills and project skills.

Install as a personal skill, available across projects:

```sh
mkdir -p ~/.claude/skills
cp -R skills/zzap-directory-resolver ~/.claude/skills/
```

Install as a project skill, available only in the current project:

```sh
mkdir -p .claude/skills
cp -R /path/to/zzap/skills/zzap-directory-resolver .claude/skills/
```

Then ask Claude Code to use it:

```text
Use the zzap-directory-resolver skill to resolve the right workdir before editing.
```

## Expected Agent Behavior

The skill instructs agents to:

- Use `zzap query "<phrase>" --json --limit 5` before broad filesystem search.
- Use a result as `workdir` only when it is clearly correct.
- Ask the user to disambiguate close or semantically different matches.
- Record successful usage with `zzap record <path> --query "<phrase>" --actor agent`.
- Avoid calling `zz`, because `zz` opens the interactive picker.

## Requirement

The `zzap` binary must be installed and available on `PATH`:

```sh
zzap doctor --json
```
