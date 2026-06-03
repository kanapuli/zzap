# zzap

[![CI](https://github.com/kanapuli/zzap/actions/workflows/ci.yml/badge.svg)](https://github.com/kanapuli/zzap/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933)
![Runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-2ea44f)
![Agent native](https://img.shields.io/badge/agent_native-JSON_CLI-ffb000)
![License](https://img.shields.io/badge/license-MIT-blue)

`zzap` is a TypeScript CLI that installs the `zz` command: a fuzzy,
frecency-powered directory jumper.

It borrows the useful picker ideas from `fff.nvim` and applies them to
directory navigation:

- fuzzy matching with path-segment awareness
- frecency ranking, where frequent and recent directories rise over time
- query-to-directory combo boosts when the same query repeatedly selects a path
- an interactive split picker with directory preview
- shell integration so `zz` can change the current shell directory

## Install locally

```sh
npm install
npm run build
npm link
```

## Shell setup

Add this to your shell configuration:

```sh
eval "$(zz init zsh)"
```

For bash:

```sh
eval "$(zz init bash)"
```

## Usage

```sh
zz
zz src
zz add ~/work/project
zz list
zz prune
zz doctor
```

`zz` opens the interactive picker. Press `Enter` to jump, `Esc` or `Ctrl-C` to
cancel, `Up`/`Down` or `Ctrl-P`/`Ctrl-N` to move, and type to filter.

## Agent Usage

`zz` is human-native and interactive. `zzap` is agent-native and structured, so
tools like Codex or Claude Code can resolve project directories without opening
the picker.

```sh
zzap query "academic paper" --json --limit 5
zzap resolve "academic paper" --json
zzap record ~/academic-research-skills/academic-paper --query "academic paper" --actor agent
zzap doctor --json
```

`zzap query` returns ranked candidates with score breakdowns:

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

Agent feedback is tracked separately from human `zz` visits. `zzap` uses both
human and agent feedback when ranking for agents, while the interactive `zz`
picker keeps using human navigation history.

## Appearance

`zz` avoids hard-coded colors and uses terminal-native styling so your terminal
theme controls the palette.

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
Node.js process startup, reading the history file, expanding child directories,
ranking, recording the selected path, and writing history back to disk.

Because processes cannot change their parent shell directory directly, `zz init`
installs a shell function that calls the compiled `zz` binary and then runs
`cd` in the shell.

## Phase 2

The project is structured so an agent-native interface can be added later
without rewriting the search engine. The core scoring, storage, and selection
logic are separated from the terminal UI.
