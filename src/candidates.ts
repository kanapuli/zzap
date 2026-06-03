import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {DirectoryRecord} from './types.js';

export async function candidateDirectories(
  records: readonly DirectoryRecord[],
  nowMs: number,
): Promise<readonly DirectoryRecord[]> {
  const byPath = new Map(records.map((record) => [record.path, record]));

  for (const record of records) {
    const childRecords = await childDirectoryRecords(record, nowMs);

    for (const childRecord of childRecords) {
      if (!byPath.has(childRecord.path)) {
        byPath.set(childRecord.path, childRecord);
      }
    }
  }

  return [...byPath.values()];
}

async function childDirectoryRecords(
  record: DirectoryRecord,
  nowMs: number,
): Promise<readonly DirectoryRecord[]> {
  try {
    const entries = await fs.readdir(record.path, {withFileTypes: true});

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => syntheticChildRecord(record, entry.name, nowMs));
  } catch {
    return [];
  }
}

function syntheticChildRecord(
  parent: DirectoryRecord,
  childName: string,
  nowMs: number,
): DirectoryRecord {
  return {
    discoveredFrom: parent.path,
    firstSeenAt: nowMs,
    lastSeenAt: parent.lastSeenAt,
    path: path.join(parent.path, childName),
    queryHits: {},
    visits: 0,
  };
}
