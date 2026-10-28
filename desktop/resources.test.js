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
  for (const face of require('./faces')) assert.ok(html.includes(`id="${face.id}"`), face.name);
});
