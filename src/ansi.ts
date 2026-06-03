export const CLEAR_SCREEN = '\x1b[2J\x1b[H';
export const HIDE_CURSOR = '\x1b[?25l';
export const SHOW_CURSOR = '\x1b[?25h';

export function cyan(value: string): string {
  return `\x1b[36m${value}\x1b[39m`;
}

export function dim(value: string): string {
  return `\x1b[2m${value}\x1b[22m`;
}

export function inverse(value: string): string {
  return `\x1b[7m${value}\x1b[27m`;
}

export function muted(value: string): string {
  return `\x1b[90m${value}\x1b[39m`;
}

export function stripAnsi(value: string): string {
  return value.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}
