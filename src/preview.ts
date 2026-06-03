import * as fs from 'node:fs/promises';
import type {Dirent} from 'node:fs';
import * as path from 'node:path';

const MAX_PREVIEW_ITEMS = 80;

export async function previewDirectory(directoryPath: string): Promise<readonly string[]> {
  try {
    const entries = await fs.readdir(directoryPath, {withFileTypes: true});
    const sorted = entries
      .toSorted((left, right) => compareDirectoryEntries(left, right))
      .slice(0, MAX_PREVIEW_ITEMS);

    if (sorted.length === 0) {
      return ['empty directory'];
    }

    return sorted.map((entry) => formatEntry(entry));
  } catch (error: unknown) {
    return [`preview unavailable: ${messageFromError(error)}`];
  }
}

function compareDirectoryEntries(left: Dirent, right: Dirent): number {
  const leftHidden = isHidden(left);
  const rightHidden = isHidden(right);

  if (!leftHidden && rightHidden) {
    return -1;
  }

  if (leftHidden && !rightHidden) {
    return 1;
  }

  if (left.isDirectory() && !right.isDirectory()) {
    return -1;
  }

  if (!left.isDirectory() && right.isDirectory()) {
    return 1;
  }

  return left.name.localeCompare(right.name);
}

function isHidden(entry: Dirent): boolean {
  return entry.name.startsWith('.');
}

function formatEntry(entry: Dirent): string {
  if (entry.isDirectory()) {
    return `${entry.name}${path.sep}`;
  }

  if (entry.isSymbolicLink()) {
    return `${entry.name}@`;
  }

  return entry.name;
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
