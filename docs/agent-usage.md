# Agent Usage

`zzap` exposes a separate `zzap` binary for agents and automation. The human
command remains `zz`, so commands like `zz paper` continue to open the
interactive picker.

## Why Agents Need It

Agents often know the task but not the right local directory. `zzap` lets an
agent resolve vague project names into ranked filesystem paths by reusing your
navigation history, query learning, and immediate child-directory discovery.

Examples:

- Resolve "academic paper" to a concrete project path.
- Pick a reliable `workdir` before running shell commands.
- Avoid repeated `find` or broad home-directory scans.
- Ask the user to disambiguate when several paths are plausible.
- Record successful agent choices as agent-specific feedback.

## Commands

```sh
zzap query <query> --json --limit 10
zzap resolve <query> --json
zzap record <path> --query <query> --actor agent
zzap doctor --json
```

All `zzap` command output is JSON. The `--json` flag is accepted for clarity and
future compatibility.

## Query

```sh
zzap query "academic paper" --json --limit 5
```

Returns ranked candidates:

```json
{
  "generatedAt": 1760000000000,
  "query": "academic paper",
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

Use this when an agent needs a shortlist and may need to ask the user which
directory is correct.

## Resolve

```sh
zzap resolve "academic paper" --json
```

Returns only the best candidate:

```json
{
  "query": "academic paper",
  "result": {
    "path": "/Users/example/academic-research-skills/academic-paper",
    "displayPath": "~/academic-research-skills/academic-paper",
    "score": 233,
    "fuzzyScore": 93,
    "frecencyScore": 120,
    "comboScore": 20,
    "source": "child",
    "discoveredFrom": "/Users/example/academic-research-skills"
  }
}
```

Use this when the agent can safely take the top-ranked directory as its
`workdir`.

## Record

```sh
zzap record /Users/example/academic-research-skills/academic-paper --query "academic paper" --actor agent
```

Records that an agent used a directory for a query:

```json
{
  "recorded": true,
  "actor": "agent",
  "path": "/Users/example/academic-research-skills/academic-paper",
  "displayPath": "~/academic-research-skills/academic-paper",
  "query": "academic paper"
}
```

Agent records are stored separately from human visits. Agent-mode queries use
both human and agent feedback, while the human `zz` picker remains driven by
human navigation history.

## Integration Pattern

An agent should usually:

1. Run `zzap query "<task or project name>" --json --limit 5`.
2. If one result is clearly best, use `result.path` or the first query result as
   the command `workdir`.
3. If several paths are plausible, show the shortlist to the user.
4. After successful work, run `zzap record <path> --query "<query>" --actor agent`.

This gives agents a fast, explainable project resolver without changing the
interactive `zz` workflow.
