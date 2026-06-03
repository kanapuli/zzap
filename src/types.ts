export interface DirectoryRecord {
  readonly discoveredFrom?: string;
  readonly path: string;
  readonly firstSeenAt: number;
  readonly lastSeenAt: number;
  readonly visits: number;
  readonly queryHits: Readonly<Record<string, number>>;
}

export interface StoreData {
  readonly version: 1;
  readonly directories: readonly DirectoryRecord[];
}

export interface FuzzyMatch {
  readonly matched: boolean;
  readonly score: number;
  readonly positions: readonly number[];
}

export interface RankedDirectory {
  readonly record: DirectoryRecord;
  readonly fuzzyScore: number;
  readonly frecencyScore: number;
  readonly comboScore: number;
  readonly score: number;
  readonly positions: readonly number[];
}

export interface TerminalSize {
  readonly columns: number;
  readonly rows: number;
}
