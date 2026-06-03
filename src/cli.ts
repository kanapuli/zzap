#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import * as nodeFs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {candidateDirectories} from './candidates.js';
import {now} from './time.js';
import {
  defaultStorePath,
  isDirectory,
  pruneMissingDirectories,
  readStore,
  recordVisit,
  writeStore,
} from './store.js';
import {normalizeDirectory, displayPath} from './path_utils.js';
import {pickDirectory} from './picker.js';
import {rankDirectories} from './rank.js';
import {parseShell, shellInit} from './shell.js';
import {openInteractiveTerminal} from './terminal.js';
import type {DirectoryRecord} from './types.js';

const VERSION = '0.1.0';

interface CommandContext {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly stderr: NodeJS.WriteStream;
  readonly stdin: NodeJS.ReadStream;
  readonly stdout: NodeJS.WriteStream;
  readonly storePath: string;
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const context: CommandContext = {
    argv,
    cwd: process.cwd(),
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
    storePath: storePathFromEnvironment(),
  };

  try {
    return await run(context);
  } catch (error: unknown) {
    context.stderr.write(`${messageFromError(error)}\n`);
    return 1;
  }
}

async function run(context: CommandContext): Promise<number> {
  const [command, ...rest] = context.argv;

  switch (command) {
    case undefined:
      return jump(context, []);
    case '__jump':
      return jump(context, rest);
    case 'add':
      return add(context, rest);
    case 'doctor':
      return doctor(context);
    case 'help':
    case '--help':
    case '-h':
      context.stdout.write(helpText());
      return 0;
    case 'init':
      return init(context, rest);
    case 'list':
      return list(context);
    case 'prune':
      return prune(context);
    case '--version':
    case '-v':
      context.stdout.write(`${VERSION}\n`);
      return 0;
    default:
      return jump(context, context.argv);
  }
}

async function jump(context: CommandContext, args: readonly string[]): Promise<number> {
  const query = args.join(' ');
  const data = await readStore(context.storePath);

  if (data.directories.length === 0) {
    context.stderr.write('zz has no directories yet. Run `zz add <dir>` first.\n');
    return 1;
  }

  const nowMs = now();
  const candidates = await candidateDirectories(data.directories, nowMs);
  const terminal = openInteractiveTerminal(context.stdin, context.stderr);
  const selectedPath = terminal !== undefined ?
    await pickWithTerminal(candidates, query, nowMs, terminal) :
    firstMatchPath(candidates, query, nowMs);

  if (terminal !== undefined) {
    terminal.close();
  }

  if (selectedPath === undefined) {
    return 130;
  }

  const updated = recordVisit(data, selectedPath, query, now());
  await writeStore(context.storePath, updated);
  context.stdout.write(`${selectedPath}\n`);
  return 0;
}

async function pickWithTerminal(
  records: readonly DirectoryRecord[],
  query: string,
  nowMs: number,
  terminal: ReturnType<typeof openInteractiveTerminal> & {},
): Promise<string | undefined> {
  return pickDirectory({
      initialQuery: query,
      nowMs,
      records,
      stderr: terminal.output,
      stdin: terminal.input,
    });
}

async function add(context: CommandContext, args: readonly string[]): Promise<number> {
  const inputPath = args[0] ?? context.cwd;
  const directoryPath = normalizeDirectory(inputPath, context.cwd);

  if (!await isDirectory(directoryPath)) {
    context.stderr.write(`Not a directory: ${directoryPath}\n`);
    return 1;
  }

  const data = await readStore(context.storePath);
  const updated = recordVisit(data, directoryPath, '', now());
  await writeStore(context.storePath, updated);
  context.stdout.write(`added ${displayPath(directoryPath)}\n`);
  return 0;
}

async function list(context: CommandContext): Promise<number> {
  const data = await readStore(context.storePath);

  for (const record of data.directories.toSorted((left, right) => right.lastSeenAt - left.lastSeenAt)) {
    context.stdout.write(`${record.visits.toString().padStart(4, ' ')}  ${displayPath(record.path)}\n`);
  }

  return 0;
}

async function prune(context: CommandContext): Promise<number> {
  const data = await readStore(context.storePath);
  const pruned = await pruneMissingDirectories(data);
  await writeStore(context.storePath, pruned);
  const removed = data.directories.length - pruned.directories.length;
  context.stdout.write(`removed ${removed} missing directories\n`);
  return 0;
}

async function doctor(context: CommandContext): Promise<number> {
  const storeExists = await fileExists(context.storePath);
  context.stdout.write(`zzap ${VERSION}\n`);
  context.stdout.write(`store: ${context.storePath}\n`);
  context.stdout.write(`store exists: ${storeExists ? 'yes' : 'no'}\n`);
  context.stdout.write(`tty: ${context.stdin.isTTY ? 'yes' : 'no'}\n`);
  context.stdout.write(`shell integration: ${hasShellIntegration() ? 'yes' : 'no'}\n`);
  return 0;
}

function init(context: CommandContext, args: readonly string[]): number {
  const shellName = args[0] ?? 'zsh';
  const shell = parseShell(shellName);
  context.stdout.write(`${shellInit(shell)}\n`);
  return 0;
}

function firstMatchPath(
  records: readonly DirectoryRecord[],
  query: string,
  nowMs: number,
): string | undefined {
  return rankDirectories(records, query, nowMs)[0]?.record.path;
}

function storePathFromEnvironment(): string {
  const value = process.env['ZZAP_STORE'];

  if (value !== undefined && value.length > 0) {
    return value;
  }

  return defaultStorePath();
}

function hasShellIntegration(): boolean {
  return process.env['ZZAP_SHELL_INTEGRATION'] === '1';
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function helpText(): string {
  return [
    'zzap - fuzzy directory jumping with the zz command',
    '',
    'Usage:',
    '  zz                  open picker',
    '  zz <query>          open picker with an initial query',
    '  zz add [dir]        add a directory to history',
    '  zz list             list known directories',
    '  zz prune            remove missing directories',
    '  zz init zsh|bash    print shell integration',
    '  zz doctor           print diagnostic information',
    '',
  ].join('\n');
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isEntrypoint(): boolean {
  const entrypoint = process.argv[1];

  if (entrypoint === undefined) {
    return false;
  }

  const modulePath = fileURLToPath(import.meta.url);

  try {
    return nodeFs.realpathSync(entrypoint) === nodeFs.realpathSync(modulePath);
  } catch {
    return entrypoint === modulePath;
  }
}

if (isEntrypoint()) {
  process.exitCode = await main();
}
