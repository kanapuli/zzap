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

export type ThemeName = 'ember' | 'mono' | 'ocean';

export function themeFromEnvironment(environment: NodeJS.ProcessEnv = process.env): PickerTheme {
  return pickerTheme(parseThemeName(environment['ZZAP_THEME']));
}

export function pickerTheme(name: ThemeName): PickerTheme {
  switch (name) {
    case 'ember':
      return {
        accent: color256(214),
        dim,
        header: boldColor256(214),
        match: boldColor256(80),
        previewTitle: color256(244),
        score: color256(240),
        selected: compose(bold, inverse),
        separator: color256(238),
      };
    case 'mono':
      return {
        accent: bold,
        dim,
        header: bold,
        match: underline,
        previewTitle: dim,
        score: dim,
        selected: inverse,
        separator: dim,
      };
    case 'ocean':
      return {
        accent: color256(81),
        dim,
        header: boldColor256(81),
        match: boldColor256(123),
        previewTitle: color256(109),
        score: color256(66),
        selected: compose(bold, inverse),
        separator: color256(24),
      };
  }
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

function color256(code: number): TextStyle {
  return (value: string) => `\x1b[38;5;${code}m${value}\x1b[39m`;
}

function boldColor256(code: number): TextStyle {
  return compose(bold, color256(code));
}

function compose(first: TextStyle, second: TextStyle): TextStyle {
  return (value: string) => first(second(value));
}

function parseThemeName(value: string | undefined): ThemeName {
  if (value === 'mono' || value === 'ocean' || value === 'ember') {
    return value;
  }

  return 'ember';
}
