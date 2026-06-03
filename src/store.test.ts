import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {recordVisit} from './store.js';
import type {StoreData} from './types.js';

test('recordVisit adds and updates directory visits', () => {
  const initial: StoreData = {
    directories: [],
    version: 1,
  };
  const first = recordVisit(initial, '/tmp/project', 'proj', 1000);
  const second = recordVisit(first, '/tmp/project', 'proj', 2000);

  assert.equal(second.directories.length, 1);
  assert.equal(second.directories[0]?.visits, 2);
  assert.equal(second.directories[0]?.queryHits['proj'], 2);
  assert.equal(second.directories[0]?.firstSeenAt, 1000);
  assert.equal(second.directories[0]?.lastSeenAt, 2000);
});
