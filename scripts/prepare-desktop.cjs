const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dest = path.join(root, 'dist');
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(root, 'app'), path.join(dest, 'app'), { recursive: true });
fs.mkdirSync(path.join(dest, 'desktop'));
for (const file of ['widget.html', 'widget.js', 'widget-frame.css', 'settings.html', 'settings.js'])
  fs.copyFileSync(path.join(root, 'desktop', file), path.join(dest, 'desktop', file));
fs.writeFileSync(path.join(root, 'src-tauri', 'faces.json'), JSON.stringify(require('../desktop/faces')));
