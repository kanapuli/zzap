# zzap

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

## Appearance

`zz` avoids hard-coded colors and uses terminal-native styling so your terminal
theme controls the palette.

Because processes cannot change their parent shell directory directly, `zz init`
installs a shell function that calls the compiled `zz` binary and then runs
`cd` in the shell.

## Phase 2

The project is structured so an agent-native interface can be added later
without rewriting the search engine. The core scoring, storage, and selection
logic are separated from the terminal UI.
