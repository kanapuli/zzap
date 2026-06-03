import * as os from 'node:os';
import * as path from 'node:path';

export function expandHome(inputPath: string): string {
  if (inputPath === '~') {
    return os.homedir();
  }

  if (inputPath.startsWith('~/')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export function normalizeDirectory(inputPath: string, cwd: string): string {
  return path.resolve(cwd, expandHome(inputPath));
}

export function displayPath(inputPath: string): string {
  const home = os.homedir();

  if (inputPath === home) {
    return '~';
  }

  if (inputPath.startsWith(`${home}${path.sep}`)) {
    return `~${path.sep}${path.relative(home, inputPath)}`;
  }

  return inputPath;
}

export function basename(inputPath: string): string {
  const name = path.basename(inputPath);
  return name.length > 0 ? name : inputPath;
}

export function shortenPath(inputPath: string, maxLength: number): string {
  if (inputPath.length <= maxLength) {
    return inputPath;
  }

  if (maxLength <= 5) {
    return inputPath.slice(0, maxLength);
  }

  const keep = maxLength - 3;
  const front = Math.ceil(keep / 2);
  const back = Math.floor(keep / 2);

  return `${inputPath.slice(0, front)}...${inputPath.slice(inputPath.length - back)}`;
}
