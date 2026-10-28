const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseTag, applyVersion } = require('./release-version.cjs');

test('release tags produce matching desktop and monotonically increasing Android versions', () => {
  assert.deepEqual(parseTag('v1.2.3'), { tag: 'v1.2.3', version: '1.2.3', androidCode: 1_002_003 });
  assert.ok(parseTag('v1.3.0').androidCode > parseTag('v1.2.999').androidCode);
  assert.ok(parseTag('v2.0.0').androidCode > parseTag('v1.999.999').androidCode);
  for (const tag of ['main', 'v01.2.3', 'v1.2.3-beta.1', 'v0.0.0', 'v1.1000.0', 'v9999.0.0', 'v1.2.3\n', 'v1.2.3\nmalicious=value']) assert.throws(() => parseTag(tag));
});

test('tag version updates package and lockfile together without changing dependencies', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deskclock-version-'));
  try {
    const pkg = { name: 'clock', version: '1.0.0', devDependencies: { test: '1' } };
    const lock = { version: '1.0.0', packages: { '': { version: '1.0.0' }, dependency: { version: '4.0.0' } } };
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
    fs.writeFileSync(path.join(root, 'package-lock.json'), JSON.stringify(lock));
    applyVersion(root, '2.3.4');
    const updated = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
    const updatedLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
    assert.equal(updated.version, '2.3.4');
    assert.deepEqual(updated.devDependencies, pkg.devDependencies);
    assert.equal(updatedLock.version, '2.3.4');
    assert.equal(updatedLock.packages[''].version, '2.3.4');
    assert.equal(updatedLock.packages.dependency.version, '4.0.0');
  } finally {
    for (const name of ['package.json', 'package-lock.json']) fs.unlinkSync(path.join(root, name));
    fs.rmdirSync(root);
  }
});
