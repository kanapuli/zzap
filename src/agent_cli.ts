#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import * as nodeFs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {queryForAgent, recordForAgent, resolveForAgent} from './agent.js';
import {defaultStorePath} from './store.js';
import {now} from './time.js';
import type {VisitActor} from './store.js';

const VERSION = '0.1.0';
const DEFAULT_LIMIT = 10;

interface CommandContext {
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly stderr: NodeJS.WriteStream;
  readonly stdout: NodeJS.WriteStream;
  readonly storePath: string;
}

interface ParsedOptions {
  readonly actor: VisitActor;
  readonly json: boolean;
  readonly limit: number;
  readonly positional: readonly string[];
  readonly query: string;
}

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const context: CommandContext = {
    argv,
    cwd: process.cwd(),
    stderr: process.stderr,
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
    case 'doctor':
      return doctor(context, parseOptions(rest));
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      context.stdout.write(helpText());
      return 0;
    case 'query':
      return query(context, parseOptions(rest));
    case 'record':
      return record(context, parseOptions(rest));
    case 'resolve':
      return resolve(context, parseOptions(rest));
    case '--version':
    case '-v':
      context.stdout.write(`${VERSION}\n`);
      return 0;
    default:
      throw new Error(`Unknown zzap command: ${command}`);
  }
}

async function query(context: CommandContext, options: ParsedOptions): Promise<number> {
  const response = await queryForAgent({
    limit: options.limit,
    nowMs: now(),
    query: queryFromOptions(options),
    storePath: context.storePath,
  });

  writeJson(context.stdout, response);
  return 0;
}

async function resolve(context: CommandContext, options: ParsedOptions): Promise<number> {
  const result = await resolveForAgent({
    limit: 1,
    nowMs: now(),
    query: queryFromOptions(options),
    storePath: context.storePath,
  });

  writeJson(context.stdout, {
    query: queryFromOptions(options),
    result: result ?? null,
  });
  return result === undefined ? 2 : 0;
}

async function record(context: CommandContext, options: ParsedOptions): Promise<number> {
  const [path] = options.positional;

  if (path === undefined) {
    throw new Error('Usage: zzap record <path> --query <query> [--actor user|agent]');
  }

  const response = await recordForAgent({
    actor: options.actor,
    cwd: context.cwd,
    nowMs: now(),
    path,
    query: options.query,
    storePath: context.storePath,
  });

  writeJson(context.stdout, response);
  return 0;
}

async function doctor(context: CommandContext, options: ParsedOptions): Promise<number> {
  const storeExists = await fileExists(context.storePath);
  const response = {
    mode: 'agent',
    store: context.storePath,
    storeExists,
    version: VERSION,
  };

  if (options.json) {
    writeJson(context.stdout, response);
  } else {
    writeJson(context.stdout, response);
  }

  return 0;
}

function parseOptions(args: readonly string[]): ParsedOptions {
  const positional: string[] = [];
  let actor: VisitActor = 'agent';
  let json = true;
  let limit = DEFAULT_LIMIT;
  let query = '';

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === '--json') {
      json = true;
      continue;
    }

    if (arg === '--limit') {
      limit = parsePositiveInteger(requiredValue(args, index, '--limit'), '--limit');
      index++;
      continue;
    }

    if (arg === '--query') {
      query = requiredValue(args, index, '--query');
      index++;
      continue;
    }

    if (arg === '--actor') {
      actor = parseActor(requiredValue(args, index, '--actor'));
      index++;
      continue;
    }

    if (arg === undefined) {
      continue;
    }

    positional.push(arg);
  }

  return {
    actor,
    json,
    limit,
    positional,
    query,
  };
}

function queryFromOptions(options: ParsedOptions): string {
  if (options.query.length > 0) {
    return options.query;
  }

  return options.positional.join(' ');
}

function parsePositiveInteger(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }

  return parsed;
}

function parseActor(value: string): VisitActor {
  if (value === 'agent' || value === 'user') {
    return value;
  }

  throw new Error('--actor must be "agent" or "user".');
}

function requiredValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function writeJson(stdout: NodeJS.WriteStream, value: unknown): void {
  stdout.write(`${JSON.stringify(value, undefined, 2)}\n`);
}

function storePathFromEnvironment(): string {
  const value = process.env['ZZAP_STORE'];

  if (value !== undefined && value.length > 0) {
    return value;
  }

  return defaultStorePath();
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
    'zzap - agent-native directory resolution for zzap history',
    '',
    'Usage:',
    '  zzap query <query> [--limit N] [--json]',
    '  zzap resolve <query> [--json]',
    '  zzap record <path> --query <query> [--actor agent|user]',
    '  zzap doctor [--json]',
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
