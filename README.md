# zzap

[![CI](https://github.com/kanapuli/zzap/actions/workflows/ci.yml/badge.svg)](https://github.com/kanapuli/zzap/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933)
![Runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-2ea44f)
![Agent native](https://img.shields.io/badge/agent_native-JSON_CLI-ffb000)
![License](https://img.shields.io/badge/license-MIT-blue)

Fast directory jumping for humans. Structured directory memory for agents.

`zzap` gives you two commands:

- `zz`: an interactive fuzzy directory jumper for your shell.
- `zzap`: a JSON CLI that lets agents resolve the right project directory
  without opening a TUI.

It learns from how directories are used, ranks by fuzzy match plus frecency, and
can surface immediate child directories before you explicitly add them.

## Why

Humans and coding agents have the same local-context problem: the right project
is somewhere on disk, but the exact path is easy to forget.

`zzap` keeps a small navigation memory:

- Use `zz paper` to jump quickly as a human.
- Use `zzap query paper --json` to give Codex, Claude Code, or another agent a
  ranked shortlist.
- Record successful choices so future lookups improve.

No daemon. No database server. No runtime dependencies.

## Install

```sh
npm install
npm run build
npm link
```

Add shell integration to your shell config so `zz` can change the current
directory from future terminal sessions.

For zsh, add this to `~/.zshrc`:

```sh
eval "$(zz init zsh)"
```

Or append it directly:

```sh
printf '\neval "$(zz init zsh)"\n' >> ~/.zshrc
```

For bash, add this to `~/.bashrc`:

```sh
eval "$(zz init bash)"
```

Or append it directly:

```sh
printf '\neval "$(zz init bash)"\n' >> ~/.bashrc
```

## Human Workflow

Seed useful directories:

```sh
zz add ~/work/project
zz add .
```

Jump interactively:

```sh
zz
zz src
zz academic paper
```

Useful maintenance commands:

```sh
zz list
zz prune
zz doctor
```

In the picker:

| Key | Action |
| --- | --- |
| `Enter` | Jump to selected directory |
| `Esc` / `Ctrl-C` | Cancel |
| `Up` / `Ctrl-P` | Move up |
| `Down` / `Ctrl-N` | Move down |
| Typing | Refine fuzzy query |

`zz` uses your terminal theme. It avoids hard-coded colors and relies on
terminal-native styling.

## Agent Workflow

`zz` is human-native. `zzap` is agent-native.

Agents should use `zzap` when they need a reliable `workdir`:

```sh
zzap query "academic paper" --json --limit 5
zzap resolve "academic paper" --json
zzap record ~/academic-research-skills/academic-paper --query "academic paper" --actor agent
zzap doctor --json
```

Example `zzap query` output:

```json
{
  "query": "paper",
  "results": [
    {
      "path": "/Users/example/academic-research-skills/academic-paper",
      "displayPath": "~/academic-research-skills/academic-paper",
      "score": 233,
      "fuzzyScore": 93,
      "frecencyScore": 120,
      "comboScore": 20,
      "source": "child",
      "discoveredFrom": "/Users/example/academic-research-skills"
    }
  ]
}
```

Agent feedback is tracked separately from human `zz` visits. Agent queries use
both human and agent feedback; the interactive picker remains driven by human
navigation history.

## Agent Skills

`zzap` ships a reusable skill for agents:

```text
skills/zzap-directory-resolver/
```

Install it into Codex or Claude Code to teach agents:

- when to call `zzap query`
- when a result is safe to use as `workdir`
- when to ask the user to disambiguate
- when to record successful agent usage

See [docs/agent-skills.md](docs/agent-skills.md).

## Ranking

`zzap` ranks candidates with:

```text
total_score = fuzzy_score + frecency_score + combo_score - path_length_penalty
```

Signals:

- Fuzzy path matching with path-segment awareness.
- Frecency, so frequent and recent directories rise.
- Query combo boosts, so repeated query-to-directory choices are learned.
- Immediate child-directory discovery from known paths.

Read the full scoring explanation in [docs/ranking.md](docs/ranking.md).

## Benchmark

Benchmarked on Darwin arm64 with Node.js v22.16.0. Values are wall-clock median
and p95 times from repeated local runs after warmup.

| Operation | Dataset | Median | p95 |
| --- | ---: | ---: | ---: |
| In-memory ranking | 1,000 candidates | 0.63 ms | 0.75 ms |
| In-memory ranking | 10,000 candidates | 8.07 ms | 9.98 ms |
| Candidate expansion | 100 stored dirs + 1,000 child dirs | 3.42 ms | 4.63 ms |
| End-to-end non-interactive jump | 100 stored dirs + 1,000 child dirs | 63.03 ms | 63.83 ms |

The ranking engine itself is sub-millisecond for 1,000 candidates and under
10 ms for 10,000 candidates in this benchmark. End-to-end CLI time includes
Node.js process startup, reading history, expanding child directories, ranking,
recording the selected path, and writing history back to disk.

## Docs

- [Agent usage](docs/agent-usage.md)
- [Agent skill installation](docs/agent-skills.md)
- [Ranking model](docs/ranking.md)

## Notes

Processes cannot change their parent shell directory directly. `zz init`
installs a shell function that calls the compiled `zz` binary and then runs
`cd` in your active shell.
