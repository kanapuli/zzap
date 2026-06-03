import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {stripAnsi, themeFromEnvironment} from './ansi.js';

test('themeFromEnvironment falls back to ember for unknown themes', () => {
  const theme = themeFromEnvironment({
    ZZAP_THEME: 'unknown',
  });

  assert.equal(stripAnsi(theme.header('zz')), 'zz');
});
