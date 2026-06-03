import type {DirectoryRecord} from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_DAYS = 14;
const MAX_COMBO_BOOST = 400;

export function frecencyScore(record: DirectoryRecord, nowMs: number): number {
  const ageDays = Math.max(0, (nowMs - record.lastSeenAt) / DAY_MS);
  const decay = Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
  return Math.log2(record.visits + 1) * 100 * decay;
}

export function comboScore(record: DirectoryRecord, query: string): number {
  const normalizedQuery = normalizeQuery(query);

  if (normalizedQuery.length === 0) {
    return 0;
  }

  const hits = record.queryHits[normalizedQuery] ?? 0;
  return Math.min(MAX_COMBO_BOOST, hits * hits * 20);
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}
