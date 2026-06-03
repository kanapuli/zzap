import {candidateDirectories} from './candidates.js';
import {displayPath, normalizeDirectory} from './path_utils.js';
import {rankDirectories} from './rank.js';
import {
  isDirectory,
  readStore,
  recordVisit,
  writeStore,
  type VisitActor,
} from './store.js';
import type {DirectoryRecord, RankedDirectory} from './types.js';

export interface AgentQueryOptions {
  readonly limit: number;
  readonly nowMs: number;
  readonly query: string;
  readonly storePath: string;
}

export interface AgentResult {
  readonly comboScore: number;
  readonly discoveredFrom?: string;
  readonly displayPath: string;
  readonly frecencyScore: number;
  readonly fuzzyScore: number;
  readonly path: string;
  readonly score: number;
  readonly source: 'child' | 'history';
}

export interface AgentQueryResponse {
  readonly generatedAt: number;
  readonly query: string;
  readonly results: readonly AgentResult[];
}

export interface AgentRecordOptions {
  readonly actor: VisitActor;
  readonly cwd: string;
  readonly nowMs: number;
  readonly path: string;
  readonly query: string;
  readonly storePath: string;
}

export interface AgentRecordResponse {
  readonly actor: VisitActor;
  readonly displayPath: string;
  readonly path: string;
  readonly query: string;
  readonly recorded: true;
}

export async function queryForAgent(options: AgentQueryOptions): Promise<AgentQueryResponse> {
  const data = await readStore(options.storePath);
  const records = recordsWithAgentFeedback(data.directories);
  const candidates = await candidateDirectories(records, options.nowMs);
  const ranked = rankDirectories(candidates, options.query, options.nowMs)
    .slice(0, options.limit)
    .map((item) => agentResult(item));

  return {
    generatedAt: options.nowMs,
    query: options.query,
    results: ranked,
  };
}

export async function resolveForAgent(options: AgentQueryOptions): Promise<AgentResult | undefined> {
  return (await queryForAgent({
    ...options,
    limit: 1,
  })).results[0];
}

export async function recordForAgent(options: AgentRecordOptions): Promise<AgentRecordResponse> {
  const directoryPath = normalizeDirectory(options.path, options.cwd);

  if (!await isDirectory(directoryPath)) {
    throw new Error(`Not a directory: ${directoryPath}`);
  }

  const data = await readStore(options.storePath);
  const updated = recordVisit(data, directoryPath, options.query, options.nowMs, options.actor);
  await writeStore(options.storePath, updated);

  return {
    actor: options.actor,
    displayPath: displayPath(directoryPath),
    path: directoryPath,
    query: options.query,
    recorded: true,
  };
}

function recordsWithAgentFeedback(records: readonly DirectoryRecord[]): readonly DirectoryRecord[] {
  return records.map((record) => {
    const agentLastSeenAt = record.agentLastSeenAt;
    const agentVisits = record.agentVisits ?? 0;
    const agentQueryHits = record.agentQueryHits ?? {};

    if (agentLastSeenAt === undefined && agentVisits === 0 && Object.keys(agentQueryHits).length === 0) {
      return record;
    }

    return {
      ...record,
      lastSeenAt: Math.max(record.lastSeenAt, agentLastSeenAt ?? record.lastSeenAt),
      queryHits: mergeQueryHits(record.queryHits, agentQueryHits),
      visits: record.visits + agentVisits,
    };
  });
}

function mergeQueryHits(
  userHits: Readonly<Record<string, number>>,
  agentHits: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const merged: Record<string, number> = {...userHits};

  for (const [query, hits] of Object.entries(agentHits)) {
    merged[query] = (merged[query] ?? 0) + hits;
  }

  return merged;
}

function agentResult(item: RankedDirectory): AgentResult {
  const discoveredFrom = item.record.discoveredFrom;

  return {
    ...(discoveredFrom === undefined ? {} : {discoveredFrom}),
    comboScore: roundScore(item.comboScore),
    displayPath: displayPath(item.record.path),
    frecencyScore: roundScore(item.frecencyScore),
    fuzzyScore: roundScore(item.fuzzyScore),
    path: item.record.path,
    score: roundScore(item.score),
    source: discoveredFrom === undefined ? 'history' : 'child',
  };
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
