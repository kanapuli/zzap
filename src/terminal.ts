import * as fs from 'node:fs';
import * as tty from 'node:tty';

export interface InteractiveTerminal {
  readonly close: () => void;
  readonly input: NodeJS.ReadStream;
  readonly output: NodeJS.WriteStream;
}

export function openInteractiveTerminal(
  stdin: NodeJS.ReadStream,
  stderr: NodeJS.WriteStream,
): InteractiveTerminal | undefined {
  if (stdin.isTTY && stderr.isTTY) {
    return {
      close: () => undefined,
      input: stdin,
      output: stderr,
    };
  }

  try {
    const readFd = fs.openSync('/dev/tty', 'r');
    const writeFd = fs.openSync('/dev/tty', 'w');
    const input = new tty.ReadStream(readFd);
    const output = new tty.WriteStream(writeFd);

    return {
      close: () => {
        input.destroy();
        output.destroy();
      },
      input,
      output,
    };
  } catch {
    return undefined;
  }
}
