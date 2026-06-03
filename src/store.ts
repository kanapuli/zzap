import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {normalizeQuery} from './frecency.js';
import type {DirectoryRecord, StoreData} from './types.js';

const STORE_VERSION = 1;

export type VisitActor = 'agent' | 'user';

export function defaultStorePath(): string {
  const stateHome = process.env['XDG_STATE_HOME'];
  const base = stateHome !== undefined && stateHome.length > 0 ?
    stateHome :
    path.join(os.homedir(), '.local', 'state');

  return path.join(base, 'zzap', 'history.json');
}

export function emptyStore(): StoreData {
  return {
    directories: [],
    version: STORE_VERSION,
  };
}

export async function readStore(storePath: string): Promise<StoreData> {
  try {
    const raw = await fs.readFile(storePath, 'utf8');
    return parseStore(raw);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return emptyStore();
    }

    throw error;
  }
}

export async function writeStore(storePath: string, data: StoreData): Promise<void> {
  await fs.mkdir(path.dirname(storePath), {recursive: true});
  const body = `${JSON.stringify(data, undefined, 2)}\n`;
  await fs.writeFile(storePath, body, 'utf8');
}

export function recordVisit(
  data: StoreData,
  directoryPath: string,
  query: string,
  nowMs: number,
  actor: VisitActor = 'user',
): StoreData {
  if (actor === 'agent') {
    return recordAgentVisit(data, directoryPath, query, nowMs);
  }

  const normalizedQuery = normalizeQuery(query);
  const existing = data.directories.find((record) => record.path === directoryPath);
  const records = data.directories.filter((record) => record.path !== directoryPath);
  const previousQueryHits = existing?.queryHits ?? {};
  const queryHits = normalizedQuery.length === 0 ?
    previousQueryHits :
    {
      ...previousQueryHits,
      [normalizedQuery]: (previousQueryHits[normalizedQuery] ?? 0) + 1,
    };

  const nextRecord: DirectoryRecord = {
    firstSeenAt: existing?.firstSeenAt ?? nowMs,
    lastSeenAt: nowMs,
    path: directoryPath,
    queryHits,
    visits: (existing?.visits ?? 0) + 1,
  };

  return {
    directories: [...records, nextRecord],
    version: STORE_VERSION,
  };
}

function recordAgentVisit(
  data: StoreData,
  directoryPath: string,
  query: string,
  nowMs: number,
): StoreData {
  const normalizedQuery = normalizeQuery(query);
  const existing = data.directories.find((record) => record.path === directoryPath);
  const records = data.directories.filter((record) => record.path !== directoryPath);
  const previousQueryHits = existing?.agentQueryHits ?? {};
  const agentQueryHits = normalizedQuery.length === 0 ?
    previousQueryHits :
    {
      ...previousQueryHits,
      [normalizedQuery]: (previousQueryHits[normalizedQuery] ?? 0) + 1,
    };

  const nextRecord: DirectoryRecord = {
    ...existing,
    agentLastSeenAt: nowMs,
    agentQueryHits,
    agentVisits: (existing?.agentVisits ?? 0) + 1,
    firstSeenAt: existing?.firstSeenAt ?? nowMs,
    lastSeenAt: existing?.lastSeenAt ?? nowMs,
    path: directoryPath,
    queryHits: existing?.queryHits ?? {},
    visits: existing?.visits ?? 0,
  };

  return {
    directories: [...records, nextRecord],
    version: STORE_VERSION,
  };
}

export async function pruneMissingDirectories(data: StoreData): Promise<StoreData> {
  const directories: DirectoryRecord[] = [];

  for (const record of data.directories) {
    if (await isDirectory(record.path)) {
      directories.push(record);
    }
  }

  return {
    directories,
    version: STORE_VERSION,
  };
}

export async function isDirectory(inputPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(inputPath);
    return stat.isDirectory();
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

function parseStore(raw: string): StoreData {
  const parsed: unknown = JSON.parse(raw);

  if (!isStoreData(parsed)) {
    throw new Error('Invalid zzap store data.');
  }

  return parsed;
}

function isStoreData(value: unknown): value is StoreData {
  if (!isObject(value) || value['version'] !== STORE_VERSION || !Array.isArray(value['directories'])) {
    return false;
  }

  return value['directories'].every(isDirectoryRecord);
}

function isDirectoryRecord(value: unknown): value is DirectoryRecord {
  if (!isObject(value)) {
    return false;
  }

  return typeof value['path'] === 'string' &&
    typeof value['firstSeenAt'] === 'number' &&
    typeof value['lastSeenAt'] === 'number' &&
    typeof value['visits'] === 'number' &&
    isStringNumberRecord(value['queryHits']) &&
    isOptionalNumber(value['agentLastSeenAt']) &&
    isOptionalNumber(value['agentVisits']) &&
    isOptionalStringNumberRecord(value['agentQueryHits']) &&
    isOptionalString(value['discoveredFrom']);
}

function isStringNumberRecord(value: unknown): value is Readonly<Record<string, number>> {
  if (!isObject(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === 'number');
}

function isOptionalStringNumberRecord(value: unknown): value is Readonly<Record<string, number>> | undefined {
  return value === undefined || isStringNumberRecord(value);
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || typeof value === 'number';
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
