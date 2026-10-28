const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('shipped clock screens have no audio capture, detection UI, or recording permissions', () => {
  const screens = ['app/index.html', 'android/app/src/main/AndroidManifest.xml', 'android/app/src/main/java/com/precipi/deskclock/MainActivity.java'];
  // Capacitor's copied assets are generated and absent in a fresh checkout.
  const copiedScreen = 'android/app/src/main/assets/public/index.html';
  if (fs.existsSync(path.join(root, copiedScreen))) screens.push(copiedScreen);
  for (const name of screens) {
    assert.doesNotMatch(fs.readFileSync(path.join(root, name), 'utf8'), /sonar|getUserMedia|AudioContext|RECORD_AUDIO|MODIFY_AUDIO_SETTINGS|setBrightness|REQ_MIC/i, name);
  }
  for (const name of ['app/sonar-test.html', 'android/app/src/main/assets/public/sonar-test.html']) assert.equal(fs.existsSync(path.join(root, name)), false, name);
  const html = fs.readFileSync(path.join(root, 'app/index.html'), 'utf8');
  assert.doesNotMatch(html, /id="face[149]"|[.#]f[149]-|#face[149]\b|Brutal Minimal|Brutal Electric|Liquid Glass/i);
  assert.equal(require('./faces').length, 7);
  const animations = new Set([...html.matchAll(/@keyframes\s+([\w-]+)/g)].map(match => match[1]));
  for (const match of html.matchAll(/animation\s*:\s*([a-zA-Z_][\w-]*)/g)) {
    if (match[1] !== 'none') assert.ok(animations.has(match[1]), `Missing animation: ${match[1]}`);
  }
  for (const face of require('./faces')) assert.ok(html.includes(`id="${face.id}"`), face.name);
});
