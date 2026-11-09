const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
test('desktop faces start transparent and retain bundled fonts without changing Android', () => {
  const source = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
  execFileSync(process.execPath, [path.join(__dirname, 'prepare-desktop.cjs')]);
  const html = fs.readFileSync(path.join(root, 'dist/app/index.html'), 'utf8');
  assert.match(html, /body\s*\{\s*background:transparent;/);
  assert.match(html, /<style id="desktop-transparency">html,body\{background:transparent!important\}<\/style><\/head>/);
  assert.equal(fs.readFileSync(path.join(root, 'app/index.html'), 'utf8'), source);
  assert.match(source, /body\s*\{\s*background:#000;/);
  for (const name of fs.readdirSync(path.join(root, 'app/fonts'))) {
    assert.deepEqual(fs.readFileSync(path.join(root, 'dist/app/fonts', name)), fs.readFileSync(path.join(root, 'app/fonts', name)));
  }
  assert.equal(fs.existsSync(path.join(root, 'dist/desktop/bridge.test.js')), false);
});
