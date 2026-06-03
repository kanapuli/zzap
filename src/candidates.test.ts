import {strict as assert} from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {test} from 'node:test';
import {candidateDirectories} from './candidates.js';
import {rankDirectories} from './rank.js';
import type {DirectoryRecord} from './types.js';

test('candidateDirectories includes immediate child directories', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zzap-fixture-'));
  const child = path.join(root, 'academic-paper');

  await fs.mkdir(child);
  await fs.writeFile(path.join(root, 'README.md'), '', 'utf8');

  const records: DirectoryRecord[] = [
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: root,
      queryHits: {},
      visits: 1,
    },
  ];

  const candidates = await candidateDirectories(records, 200);

  assert.ok(candidates.some((candidate) => candidate.path === child));
  assert.ok(!candidates.some((candidate) => candidate.path === path.join(root, 'README.md')));
});

test('rankDirectories can find a discovered child directory', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zzap-fixture-'));
  const child = path.join(root, 'academic-paper');

  await fs.mkdir(child);

  const records: DirectoryRecord[] = [
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: root,
      queryHits: {},
      visits: 1,
    },
  ];

  const candidates = await candidateDirectories(records, 200);
  const ranked = rankDirectories(candidates, 'paper', 200);

  assert.equal(ranked[0]?.record.path, child);
});
