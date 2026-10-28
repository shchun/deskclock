const fs = require('node:fs');
const path = require('node:path');

function parseTag(tag) {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  if (!match || match[0] !== tag) throw new Error('Use a stable version tag such as v1.1.0');
  const [major, minor, patch] = match.slice(1).map(Number);
  const androidCode = major * 1_000_000 + minor * 1_000 + patch;
  if (minor > 999 || patch > 999 || !Number.isSafeInteger(androidCode) || androidCode < 1 || androidCode > 2_100_000_000) {
    throw new Error('Version exceeds the Android versionCode range (minor/patch must be 0–999)');
  }
  return { tag, version: match.slice(1).join('.'), androidCode };
}

function applyVersion(root, version) {
  const packagePath = path.join(root, 'package.json');
  const lockPath = path.join(root, 'package-lock.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  pkg.version = lock.version = lock.packages[''].version = version;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

if (require.main === module) {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const info = parseTag(process.env.RELEASE_TAG || `v${pkg.version}`);
  if (!process.argv.includes('--check-only')) applyVersion(root, info.version);
  const output = `tag=${info.tag}\nversion=${info.version}\nandroid_code=${info.androidCode}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
}

module.exports = { parseTag, applyVersion };
