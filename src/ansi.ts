export const CLEAR_SCREEN = '\x1b[2J\x1b[H';
export const HIDE_CURSOR = '\x1b[?25l';
export const SHOW_CURSOR = '\x1b[?25h';

export type TextStyle = (value: string) => string;

export interface PickerTheme {
  readonly accent: TextStyle;
  readonly dim: TextStyle;
  readonly header: TextStyle;
  readonly match: TextStyle;
  readonly previewTitle: TextStyle;
  readonly score: TextStyle;
  readonly selected: TextStyle;
  readonly separator: TextStyle;
}

export function defaultPickerTheme(): PickerTheme {
  return {
    accent: bold,
    dim,
    header: bold,
    match: underline,
    previewTitle: dim,
    score: dim,
    selected: compose(bold, inverse),
    separator: dim,
  };
}

export function dim(value: string): string {
  return `\x1b[2m${value}\x1b[22m`;
}

export function inverse(value: string): string {
  return `\x1b[7m${value}\x1b[27m`;
}

export function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

function bold(value: string): string {
  return `\x1b[1m${value}\x1b[22m`;
}

function underline(value: string): string {
  return `\x1b[4m${value}\x1b[24m`;
}

function compose(first: TextStyle, second: TextStyle): TextStyle {
  return (value: string) => first(second(value));
}
