import {CLEAR_SCREEN, HIDE_CURSOR, SHOW_CURSOR, cyan, dim, inverse, muted, stripAnsi} from './ansi.js';
import {previewDirectory} from './preview.js';
import {rankDirectories} from './rank.js';
import {displayPath, shortenPath} from './path_utils.js';
import type {DirectoryRecord, RankedDirectory, TerminalSize} from './types.js';

interface PickerState {
  readonly query: string;
  readonly selectedIndex: number;
  readonly ranked: readonly RankedDirectory[];
  readonly previewLines: readonly string[];
}

interface PickerOptions {
  readonly initialQuery: string;
  readonly nowMs: number;
  readonly records: readonly DirectoryRecord[];
  readonly stderr: NodeJS.WriteStream;
  readonly stdin: NodeJS.ReadStream;
}

type PickerAction =
  | {readonly kind: 'append'; readonly value: string}
  | {readonly kind: 'backspace'}
  | {readonly kind: 'down'}
  | {readonly kind: 'up'};

export async function pickDirectory(options: PickerOptions): Promise<string | undefined> {
  const initialRanked = rankDirectories(options.records, options.initialQuery, options.nowMs);
  let state: PickerState = {
    previewLines: await selectedPreview(initialRanked, 0),
    query: options.initialQuery,
    ranked: initialRanked,
    selectedIndex: 0,
  };

  if (state.ranked.length === 0 && options.initialQuery.length > 0) {
    render(options.stderr, state);
  }

  return new Promise((resolve) => {
    const stdin = options.stdin;
    const stderr = options.stderr;
    const wasRaw = stdin.isRaw;

    function cleanup(): void {
      stderr.write(`${CLEAR_SCREEN}${SHOW_CURSOR}`);
      stdin.off('data', onData);
      process.off('SIGWINCH', onResize);

      if (stdin.isTTY) {
        stdin.setRawMode(wasRaw);
      }

      stdin.pause();
    }

    async function applyAction(action: PickerAction): Promise<void> {
      state = nextState(state, action, options.records, options.nowMs);
      state = {
        ...state,
        previewLines: await selectedPreview(state.ranked, state.selectedIndex),
      };
      render(stderr, state);
    }

    function finish(value: string | undefined): void {
      cleanup();
      resolve(value);
    }

    function onResize(): void {
      render(stderr, state);
    }

    function onData(chunk: Buffer): void {
      const key = chunk.toString('utf8');

      if (key === '\u0003' || key === '\u001b') {
        finish(undefined);
        return;
      }

      if (key === '\r' || key === '\n') {
        finish(state.ranked[state.selectedIndex]?.record.path);
        return;
      }

      const action = actionFromKey(key);

      if (action === undefined) {
        return;
      }

      void applyAction(action);
    }

    stderr.write(HIDE_CURSOR);

    if (stdin.isTTY) {
      stdin.setRawMode(true);
    }

    stdin.resume();
    stdin.on('data', onData);
    process.on('SIGWINCH', onResize);
    render(stderr, state);
  });
}

function nextState(
  state: PickerState,
  action: PickerAction,
  records: readonly DirectoryRecord[],
  nowMs: number,
): PickerState {
  if (action.kind === 'up') {
    return {
      ...state,
      selectedIndex: Math.max(0, state.selectedIndex - 1),
    };
  }

  if (action.kind === 'down') {
    return {
      ...state,
      selectedIndex: Math.min(Math.max(0, state.ranked.length - 1), state.selectedIndex + 1),
    };
  }

  const query = action.kind === 'append' ?
    `${state.query}${action.value}` :
    state.query.slice(0, Math.max(0, state.query.length - 1));
  const ranked = rankDirectories(records, query, nowMs);

  return {
    previewLines: [],
    query,
    ranked,
    selectedIndex: 0,
  };
}

async function selectedPreview(
  ranked: readonly RankedDirectory[],
  selectedIndex: number,
): Promise<readonly string[]> {
  const selected = ranked[selectedIndex];

  if (selected === undefined) {
    return ['no matching directory'];
  }

  return previewDirectory(selected.record.path);
}

function actionFromKey(key: string): PickerAction | undefined {
  if (key === '\u001b[A' || key === '\u0010') {
    return {kind: 'up'};
  }

  if (key === '\u001b[B' || key === '\u000e') {
    return {kind: 'down'};
  }

  if (key === '\u007f' || key === '\b') {
    return {kind: 'backspace'};
  }

  if (isPrintable(key)) {
    return {
      kind: 'append',
      value: key,
    };
  }

  return undefined;
}

function render(stderr: NodeJS.WriteStream, state: PickerState): void {
  const size = terminalSize(stderr);
  const lines = layoutLines(state, size);
  stderr.write(`${CLEAR_SCREEN}${lines.join('\n')}`);
}

function terminalSize(stream: NodeJS.WriteStream): TerminalSize {
  return {
    columns: stream.columns ?? 100,
    rows: stream.rows ?? 30,
  };
}

function layoutLines(state: PickerState, size: TerminalSize): readonly string[] {
  const header = `${cyan('zz')} ${dim('jump to')} ${state.query}`;
  const help = muted('enter jump  esc cancel  ctrl-n/down next  ctrl-p/up prev');
  const bodyHeight = Math.max(5, size.rows - 3);
  const split = size.columns >= 100;

  if (split) {
    return [
      fitLine(header, size.columns),
      ...splitBodyLines(state, size.columns, bodyHeight),
      fitLine(help, size.columns),
    ];
  }

  return [
    fitLine(header, size.columns),
    ...stackedBodyLines(state, size.columns, bodyHeight),
    fitLine(help, size.columns),
  ];
}

function splitBodyLines(
  state: PickerState,
  columns: number,
  height: number,
): readonly string[] {
  const leftWidth = Math.max(38, Math.floor(columns * 0.52));
  const rightWidth = columns - leftWidth - 3;
  const list = resultLines(state, leftWidth, height);
  const preview = previewLines(state, rightWidth, height);
  const lines: string[] = [];

  for (let index = 0; index < height; index++) {
    const left = fitLine(list[index] ?? '', leftWidth);
    const right = fitLine(preview[index] ?? '', rightWidth);
    lines.push(`${left} ${muted('│')} ${right}`);
  }

  return lines;
}

function stackedBodyLines(
  state: PickerState,
  columns: number,
  height: number,
): readonly string[] {
  const listHeight = Math.max(3, Math.floor(height * 0.6));
  const previewHeight = height - listHeight - 1;

  return [
    ...resultLines(state, columns, listHeight),
    muted('─'.repeat(columns)),
    ...previewLines(state, columns, previewHeight),
  ];
}

function resultLines(state: PickerState, width: number, height: number): readonly string[] {
  const visible = state.ranked.slice(0, height);

  if (visible.length === 0) {
    return [muted('no matches')];
  }

  return visible.map((item, index) => {
    const selected = index === state.selectedIndex;
    const prefix = selected ? cyan('> ') : '  ';
    const pathLabel = highlightPath(shortenPath(displayPath(item.record.path), width - 12), item.positions);
    const score = muted(Math.round(item.score).toString().padStart(5, ' '));
    const line = `${prefix}${pathLabel} ${score}`;

    if (selected) {
      return inverse(fitLine(line, width));
    }

    return fitLine(line, width);
  });
}

function previewLines(state: PickerState, width: number, height: number): readonly string[] {
  const selected = state.ranked[state.selectedIndex];
  const title = selected === undefined ?
    muted('preview') :
    muted(shortenPath(displayPath(selected.record.path), width));
  const body = state.previewLines.slice(0, Math.max(0, height - 1)).map((line) => `  ${line}`);

  return [
    title,
    ...body,
  ];
}

function highlightPath(value: string, positions: readonly number[]): string {
  const highlighted = new Set(positions);
  const chars = [...value];

  return chars.map((char, index) => highlighted.has(index) ? cyan(char) : char).join('');
}

function fitLine(value: string, width: number): string {
  const visibleLength = stripAnsi(value).length;

  if (visibleLength === width) {
    return value;
  }

  if (visibleLength < width) {
    return `${value}${' '.repeat(width - visibleLength)}`;
  }

  return shortenPath(value, width);
}

function isPrintable(value: string): boolean {
  return value.length === 1 && value >= ' ' && value !== '\u007f';
}
