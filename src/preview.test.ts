import {strict as assert} from 'node:assert';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {test} from 'node:test';
import {previewDirectory} from './preview.js';

test('previewDirectory shows normal folders before hidden folders', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zzap-preview-'));

  await fs.mkdir(path.join(root, '.config'));
  await fs.mkdir(path.join(root, 'Desktop'));
  await fs.writeFile(path.join(root, 'README.md'), '', 'utf8');

  const preview = await previewDirectory(root);

  assert.deepEqual(preview.slice(0, 3), ['Desktop/', 'README.md', '.config/']);
});
