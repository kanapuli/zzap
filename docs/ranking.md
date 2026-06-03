# Ranking Model

`zz` ranks directories by combining fuzzy match quality, frecency, and
query-specific learning. The goal is to make the picker useful immediately,
then adapt toward the paths you actually choose.

## Ranking Formula

For every candidate directory, `zz` computes:

```text
total_score = fuzzy_score + frecency_score + combo_score - path_length_penalty
```

Candidates are sorted by `total_score` descending. If two candidates have the
same score, the most recently visited one wins. If they are still tied, paths
are sorted alphabetically for deterministic output.

## Fuzzy Matching

README feature:

```text
fuzzy matching with path-segment awareness
```

The query does not need to be contiguous. For example, `wzz` can match
`~/WebstormProjects/zz` if those characters appear in order.

Fuzzy scoring rewards:

- Longer queries, because each query character contributes base score.
- Consecutive matches, so `src` strongly matches a literal `src` segment.
- Matches at the start of a path.
- Matches immediately after path boundaries such as `/`, `-`, `_`, `.`, or a
  space.

Fuzzy scoring penalizes:

- Large gaps between matched characters.
- Longer candidate paths through the separate path-length penalty.

Effect on ranking:

- Typing a precise segment name usually beats a loose match across many path
  segments.
- A shorter exact-looking path can outrank a long path with the same letters
  spread across it.
- If a directory does not fuzzy-match the query, it is removed from the result
  set entirely.

## Frecency Ranking

README feature:

```text
frecency ranking, where frequent and recent directories rise over time
```

Frecency combines visit count and recency:

```text
frecency_score = log2(visits + 1) * 100 * recency_decay
```

The recency decay uses a 14-day half-life. That means a directory keeps ranking
well after repeated use, but old usage gradually matters less.

Effect on ranking:

- Visiting a directory repeatedly makes it rise.
- Recently visited directories rank above equally frequent older directories.
- Very old paths slowly lose influence even if they were once popular.
- Visit count has diminishing returns because it uses `log2(visits + 1)`.

## Query Combo Boosts

README feature:

```text
query-to-directory combo boosts when the same query repeatedly selects a path
```

When you select a directory after typing a query, `zz` records that
query-to-directory association. Future uses of the same normalized query get a
combo boost:

```text
combo_score = min(400, query_hits_for_path^2 * 20)
```

Effect on ranking:

- If you repeatedly type `paper` and choose
  `~/academic-research-skills/academic-paper`, that path becomes strongly
  preferred for `paper`.
- Combo boosts are query-specific. A path boosted for `paper` is not
  automatically boosted for `docs`.
- Empty queries do not receive combo boosts.
- The boost is capped so one learned query cannot completely dominate forever.

## Directory Preview And Child Candidates

README feature:

```text
an interactive split picker with directory preview
```

The preview shows the selected directory's contents. `zz` also uses immediate
child directories from known paths as searchable candidates.

Effect on ranking:

- If `~/academic-research-skills` is known, typing `academic-paper` can jump
  directly to `~/academic-research-skills/academic-paper` even before that child
  directory has been explicitly added.
- Once a discovered child is selected, it is written to history and becomes a
  normal frecency-ranked directory.
- Discovered child directories are hidden for an empty query so the default
  picker does not get flooded with `.git`, `node_modules`, or home dotfolders.
- Discovered child directories appear when the query matches them.

## Shell Integration

README feature:

```text
shell integration so zz can change the current shell directory
```

Shell integration does not directly change ranking, but it controls when ranking
feedback is recorded. The shell function runs the `zz` binary, receives the
selected path, and then runs `cd` in the current shell.

Effect on ranking:

- A successful selection records a visit for the chosen directory.
- If a query was typed, that query is added to the chosen directory's combo
  history.
- Canceled pickers do not record ranking feedback.
- Running the binary without shell integration can print a selected path, but it
  cannot change the parent shell directory.

## Empty Query Behavior

When the query is empty:

- Every stored directory is considered a fuzzy match with a minimal fuzzy score.
- Results are dominated by frecency.
- Query combo boosts are disabled.
- Discovered child directories are hidden.
- Results are capped to 250 entries.

This makes plain `zz` behave like a recent/frequent directory launcher.

## Typed Query Behavior

When the query is non-empty:

- Candidates must fuzzy-match the query.
- Fuzzy score becomes important.
- Frecency still biases toward known useful paths.
- Query combo boosts can strongly prefer the path you usually pick for that
  exact query.
- Immediate child directories of known paths are included.
- Longer displayed paths receive a small penalty.

This makes `zz <query>` behave like an adaptive fuzzy search over known
directories and their immediate children.
