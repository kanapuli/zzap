import type {FuzzyMatch} from './types.js';

const SEPARATOR_BONUS = 12;
const CONSECUTIVE_BONUS = 16;
const START_BONUS = 8;
const GAP_PENALTY = 2;

export function fuzzyMatch(query: string, candidate: string): FuzzyMatch {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  if (normalizedQuery.length === 0) {
    return {
      matched: true,
      positions: [],
      score: 1,
    };
  }

  const matches = possibleMatches(normalizedQuery, normalizedCandidate);

  if (matches.length === 0) {
    return {
      matched: false,
      positions: [],
      score: 0,
    };
  }

  const best = matches.toSorted((left, right) => {
    const rightScore = scorePositions(candidate, right, normalizedQuery.length);
    const leftScore = scorePositions(candidate, left, normalizedQuery.length);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return firstPosition(left) - firstPosition(right);
  })[0];

  return {
    matched: true,
    positions: best ?? [],
    score: scorePositions(candidate, best ?? [], normalizedQuery.length),
  };
}

function possibleMatches(query: string, candidate: string): readonly (readonly number[])[] {
  const matches: number[][] = [];

  for (let startIndex = 0; startIndex < candidate.length; startIndex++) {
    if (candidate[startIndex] !== query[0]) {
      continue;
    }

    const positions: number[] = matchFrom(startIndex, query, candidate);

    if (positions.length === query.length) {
      matches.push(positions);
    }
  }

  return matches;
}

function matchFrom(startIndex: number, query: string, candidate: string): number[] {
  const positions = [startIndex];
  let queryIndex = 1;

  for (let candidateIndex = startIndex + 1; candidateIndex < candidate.length; candidateIndex++) {
    if (candidate[candidateIndex] === query[queryIndex]) {
      positions.push(candidateIndex);
      queryIndex++;

      if (queryIndex === query.length) {
        break;
      }
    }
  }

  return positions;
}

function firstPosition(positions: readonly number[]): number {
  return positions[0] ?? Number.MAX_SAFE_INTEGER;
}

function scorePositions(candidate: string, positions: readonly number[], queryLength: number): number {
  let score = queryLength * 20;
  let previousPosition = -1;

  for (const position of positions) {
    if (position === 0) {
      score += START_BONUS;
    } else if (isPathBoundary(candidate[position - 1] ?? '')) {
      score += SEPARATOR_BONUS;
    }

    if (previousPosition >= 0) {
      const gap = position - previousPosition - 1;

      if (gap === 0) {
        score += CONSECUTIVE_BONUS;
      } else {
        score -= gap * GAP_PENALTY;
      }
    }

    previousPosition = position;
  }

  return Math.max(1, score);
}

function isPathBoundary(value: string): boolean {
  return value === '/' || value === '-' || value === '_' || value === '.' || value === ' ';
}
