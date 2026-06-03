import {comboScore, frecencyScore} from './frecency.js';
import {fuzzyMatch} from './fuzzy.js';
import {displayPath} from './path_utils.js';
import type {DirectoryRecord, RankedDirectory} from './types.js';

const EMPTY_QUERY_LIMIT = 250;

export function rankDirectories(
  records: readonly DirectoryRecord[],
  query: string,
  nowMs: number,
): readonly RankedDirectory[] {
  const ranked: RankedDirectory[] = [];

  for (const record of records) {
    if (query.trim().length === 0 && record.discoveredFrom !== undefined) {
      continue;
    }

    const display = displayPath(record.path);
    const fuzzy = fuzzyMatch(query, display);

    if (!fuzzy.matched) {
      continue;
    }

    const frecency = frecencyScore(record, nowMs);
    const combo = comboScore(record, query);
    const queryPenalty = query.trim().length === 0 ? 0 : display.length * 0.15;
    const score = fuzzy.score + frecency + combo - queryPenalty;

    ranked.push({
      comboScore: combo,
      frecencyScore: frecency,
      fuzzyScore: fuzzy.score,
      positions: fuzzy.positions,
      record,
      score,
    });
  }

  ranked.sort(compareRankedDirectories);

  if (query.trim().length === 0) {
    return ranked.slice(0, EMPTY_QUERY_LIMIT);
  }

  return ranked;
}

function compareRankedDirectories(left: RankedDirectory, right: RankedDirectory): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.record.lastSeenAt !== left.record.lastSeenAt) {
    return right.record.lastSeenAt - left.record.lastSeenAt;
  }

  return left.record.path.localeCompare(right.record.path);
}
