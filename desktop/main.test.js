const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { EventEmitter } = require('node:events');

test('widget restores visible bounds, saves changes, and configures login startup', async () => {
  const windows = [], handlers = {}, listeners = {}, writes = [], popups = [];
  let login = {}, menu, trayMenu, cursor = { x: 100, y: 100 };
  class Window extends EventEmitter {
    constructor(options) { super(); this.options = options; this.bounds = options; this.webContents = new EventEmitter(); this.webContents.session = { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} }; this.webContents.setWindowOpenHandler = () => {}; this.webContents.send = () => {}; windows.push(this); }
    loadFile() {} setBounds(bounds) { this.bounds = bounds; } getBounds() { return this.bounds; }
    setAlwaysOnTop(value) { this.top = value; } setOpacity(value) { this.opacity = value; }
    setPosition(x, y) { this.bounds = { ...this.bounds, x, y }; this.emit('move'); }
    show() {} hide() {} focus() {} isVisible() { return true; } isDestroyed() { return false; }
  }
  const app = Object.assign(new EventEmitter(), { requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), getPath: () => '/profile', getAppPath: () => '/project', getLoginItemSettings: () => ({ openAtLogin: !!login.openAtLogin }), setLoginItemSettings: value => { login = value; }, isPackaged: true });
  const electron = { app, BrowserWindow: Window, ipcMain: { handle: (name, fn) => { handlers[name] = fn; }, on: (name, fn) => { listeners[name] = fn; } },
    Menu: { buildFromTemplate: items => { menu = items; return { items, popup(options) { popups.push({ menu: this, options }); } }; } },
    Tray: class { setToolTip() {} on() {} setContextMenu(value) { trayMenu = value; } }, nativeImage: { createFromBitmap() {} },
    screen: { getCursorScreenPoint: () => ({ ...cursor }), getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }), on() {} }, dialog: { showErrorBox: assert.fail } };
  const fakeFs = { readFileSync: () => JSON.stringify({ x: 9000, y: -500, width: 440, height: 260, compactVersion: 1 }), mkdirSync() {}, writeFileSync: (_path, value) => writes.push(JSON.parse(value)), renameSync() {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('./main'), 'utf8'), { require: name => name === 'electron' ? electron : name === 'node:fs' ? fakeFs : require(name), __dirname, process: { env: { PORTABLE_EXECUTABLE_FILE: 'C:/Apps/Clock.exe' }, execPath: 'temporary.exe' }, Buffer, setTimeout, clearTimeout });
  await Promise.resolve();
  const clock = windows[0]; clock.emit('ready-to-show');
  assert.equal(handlers['widget:get']().backgroundOpacity, .96);
  assert.equal(handlers['widget:get']().opacity, 1);
  assert.equal(clock.bounds.x, 1480); assert.equal(clock.bounds.y, 0);
  assert.equal(clock.options.skipTaskbar, true); assert.equal(clock.options.frame, false);
  assert.equal(clock.options.transparent, true); assert.equal(clock.options.backgroundColor, '#00000000');
  menu.find(item => item.label === '설정 열기').click();
  const state = handlers['widget:update']({ sender: windows[1].webContents }, { width: 800, opacity: .5, backgroundOpacity: .3, alwaysOnTop: false, autoStart: true });
  assert.equal(state.backgroundOpacity, .3); assert.equal(state.style, 'widget');
  assert.equal(clock.bounds.width, 800); assert.equal(clock.opacity, .5); assert.equal(clock.top, false);
  assert.equal(login.path, 'C:/Apps/Clock.exe'); assert.equal(state.autoStart, true);
  assert.equal(writes.at(-1).width, 800);
  assert.throws(() => handlers['widget:update']({ sender: {} }, {}));
  const clamped = handlers['widget:update']({ sender: windows[1].webContents }, { opacity: 0, width: 99999, foreground: 'invalid' });
  assert.equal(clamped.opacity, .2); assert.equal(clamped.width, 1600); assert.equal(clamped.foreground, '');
  const small = handlers['widget:update']({ sender: windows[1].webContents }, { width: 180, height: 60, style: 'original', originalFace: 'face6' });
  assert.equal(clock.bounds.width, 180); assert.equal(clock.bounds.height, 70);
  assert.equal(small.originalFace, 'face6'); assert.equal(small.faces.length, 8);
  assert.equal(small.lockAspect, true);
  const tall = handlers['widget:update']({ sender: windows[1].webContents }, { height: 200 });
  assert.equal(tall.width, Math.round(200 * 2316 / 904)); assert.equal(tall.height, 200);
  const free = handlers['widget:update']({ sender: windows[1].webContents }, { lockAspect: false, width: 180, height: 60 });
  assert.equal(free.height, 60);
  handlers['widget:update']({ sender: windows[1].webContents }, { style: 'widget' });
  const selected = () => { const value = handlers['widget:get'](); return value.style === 'widget' ? 'widget' : value.originalFace; };
  const sequence = ['widget', ...small.faces.map(face => face.id)];
  for (const direction of [1, -1]) {
    for (let step = 1; step <= sequence.length; step++) {
      listeners['widget:cycle']({ sender: clock.webContents }, direction);
      assert.equal(selected(), sequence[(step * direction + sequence.length) % sequence.length]);
    }
    assert.equal(writes.at(-1).style, 'widget');
  }
  listeners['widget:cycle']({ sender: {} }, 1);
  listeners['widget:cycle']({ sender: clock.webContents }, 2);
  assert.equal(selected(), 'widget');
  for (const removed of ['face4', 'face9']) {
    const restored = handlers['widget:update']({ sender: windows[1].webContents }, { style: 'original', originalFace: removed });
    assert.equal(restored.originalFace, 'face5');
  }
  let prevented = 0;
  clock.webContents.emit('context-menu', { preventDefault() { prevented++; } });
  assert.equal(popups.at(-1).menu, trayMenu);
  assert.equal(popups.at(-1).options.window, clock);
  clock.emit('system-context-menu', { preventDefault() { prevented++; } });
  assert.equal(popups.at(-1).menu, trayMenu);
  assert.equal(prevented, 2);
  const beforeDrag = { ...clock.getBounds() };
  cursor = { x: 150, y: 130 };
  // The pointer may already have moved before the start IPC reaches the main process.
  listeners['widget:drag-start']({ sender: clock.webContents }, { x: 100, y: 100 });
  listeners['widget:drag-move']({ sender: {} });
  assert.equal(clock.bounds.x, beforeDrag.x);
  listeners['widget:drag-move']({ sender: clock.webContents });
  assert.equal(clock.bounds.x, beforeDrag.x + 50);
  assert.equal(clock.bounds.y, beforeDrag.y + 30);
  listeners['widget:drag-end']({ sender: clock.webContents });
  assert.equal(writes.at(-1).x, clock.bounds.x);
  cursor = { x: 200, y: 200 };
  listeners['widget:drag-move']({ sender: clock.webContents });
  assert.equal(clock.bounds.x, beforeDrag.x + 50);
});
