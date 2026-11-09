import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const { assetPath } = createRequire(import.meta.url)('../desktop/assets.cjs');
const root = path.resolve('dist');

test('desktop origin resolves root-relative bundled charts without a server', () => {
  assert.equal(assetPath(root, 'trainer://app/'), path.join(root, 'index.html'));
  assert.equal(assetPath(root, 'trainer://app/sources/preflop-0-0.svg'), path.join(root, 'sources/preflop-0-0.svg'));
  assert.equal(assetPath(root, 'trainer://app/assets/app.js?version=1'), path.join(root, 'assets/app.js'));
});
test('desktop protocol refuses other origins and encoded filesystem traversal', () => {
  for (const url of ['https://app/index.html', 'trainer://other/index.html', 'trainer://app/%2e%2e%2fpackage.json', 'trainer://app/%5cwindows%5cfile', 'trainer://app/%00']) {
    assert.throws(() => assetPath(root, url), url);
  }
});
