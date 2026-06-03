import {strict as assert} from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {test} from 'node:test';
import {queryForAgent, recordForAgent, resolveForAgent} from './agent.js';
import {rankDirectories} from './rank.js';
import {readStore, writeStore} from './store.js';
import type {DirectoryRecord, StoreData} from './types.js';

test('queryForAgent returns structured ranked child candidates', async () => {
  const fixture = await createFixture();
  const child = path.join(fixture.project, 'academic-paper');

  await fs.mkdir(child);
  await writeStore(fixture.storePath, storeWithRecords([
    record(fixture.project, 1, 1000),
  ]));

  const response = await queryForAgent({
    limit: 5,
    nowMs: 2000,
    query: 'paper',
    storePath: fixture.storePath,
  });

  assert.equal(response.query, 'paper');
  assert.equal(response.results[0]?.path, child);
  assert.equal(response.results[0]?.source, 'child');
  assert.equal(response.results[0]?.discoveredFrom, fixture.project);
});

test('recordForAgent stores agent feedback separately from user visits', async () => {
  const fixture = await createFixture();

  await writeStore(fixture.storePath, storeWithRecords([
    record(fixture.project, 1, 1000),
  ]));

  await recordForAgent({
    actor: 'agent',
    cwd: fixture.root,
    nowMs: 3000,
    path: fixture.project,
    query: 'paper',
    storePath: fixture.storePath,
  });

  const stored = await readStore(fixture.storePath);
  const storedRecord = stored.directories[0];

  assert.equal(storedRecord?.visits, 1);
  assert.equal(storedRecord?.agentVisits, 1);
  assert.equal(storedRecord?.queryHits['paper'], undefined);
  assert.equal(storedRecord?.agentQueryHits?.['paper'], 1);
});

test('agent feedback affects agent resolution without changing user ranking input', async () => {
  const fixture = await createFixture();
  const other = path.join(fixture.root, 'other-project');

  await fs.mkdir(other);
  await writeStore(fixture.storePath, storeWithRecords([
    record(fixture.project, 1, 1000),
    record(other, 2, 2000),
  ]));

  await recordForAgent({
    actor: 'agent',
    cwd: fixture.root,
    nowMs: 3000,
    path: fixture.project,
    query: 'project',
    storePath: fixture.storePath,
  });
  await recordForAgent({
    actor: 'agent',
    cwd: fixture.root,
    nowMs: 4000,
    path: fixture.project,
    query: 'project',
    storePath: fixture.storePath,
  });

  const resolved = await resolveForAgent({
    limit: 1,
    nowMs: 5000,
    query: 'project',
    storePath: fixture.storePath,
  });
  const humanRanked = rankDirectories((await readStore(fixture.storePath)).directories, 'project', 5000);

  assert.equal(resolved?.path, fixture.project);
  assert.equal(humanRanked[0]?.record.path, other);
});

interface Fixture {
  readonly project: string;
  readonly root: string;
  readonly storePath: string;
}

async function createFixture(): Promise<Fixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zzap-agent-'));
  const project = path.join(root, 'academic-project');
  const storePath = path.join(root, 'history.json');

  await fs.mkdir(project);

  return {
    project,
    root,
    storePath,
  };
}

function record(directoryPath: string, visits: number, lastSeenAt: number): DirectoryRecord {
  return {
    firstSeenAt: 0,
    lastSeenAt,
    path: directoryPath,
    queryHits: {},
    visits,
  };
}

function storeWithRecords(directories: readonly DirectoryRecord[]): StoreData {
  return {
    directories,
    version: 1,
  };
}
