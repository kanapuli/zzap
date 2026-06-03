import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {rankDirectories} from './rank.js';
import type {DirectoryRecord} from './types.js';

test('rankDirectories prefers query combo hits when fuzzy scores are similar', () => {
  const records: DirectoryRecord[] = [
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: '/work/api-service',
      queryHits: {},
      visits: 1,
    },
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: '/work/app-shell',
      queryHits: {
        app: 3,
      },
      visits: 1,
    },
  ];

  const ranked = rankDirectories(records, 'app', 200);

  assert.equal(ranked[0]?.record.path, '/work/app-shell');
});

test('rankDirectories returns recent entries for an empty query', () => {
  const records: DirectoryRecord[] = [
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: '/old',
      queryHits: {},
      visits: 1,
    },
    {
      firstSeenAt: 0,
      lastSeenAt: 200,
      path: '/new',
      queryHits: {},
      visits: 1,
    },
  ];

  const ranked = rankDirectories(records, '', 300);

  assert.equal(ranked[0]?.record.path, '/new');
});

test('rankDirectories prefers a literal path segment over an earlier loose match', () => {
  const records: DirectoryRecord[] = [
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: '/Users/example/WebstormProjects/zz',
      queryHits: {},
      visits: 1,
    },
    {
      firstSeenAt: 0,
      lastSeenAt: 100,
      path: '/Users/example/WebstormProjects/zz/src',
      queryHits: {},
      visits: 1,
    },
  ];

  const ranked = rankDirectories(records, 'src', 200);

  assert.equal(ranked[0]?.record.path, '/Users/example/WebstormProjects/zz/src');
});
