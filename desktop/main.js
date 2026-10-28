const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const faces = require('./faces');
// Galaxy Z Fold5 cover screen, rotated to landscape: Samsung's 2316 × 904 pixels.
const aspectRatio = 2316 / 904;
let clock, settingsWindow, tray, state, saveTimer;
const defaults = { width: 360, height: Math.round(360 / aspectRatio), lockAspect: true, compactVersion: 1, originalFace: 'face5', alwaysOnTop: true, opacity: 1, backgroundOpacity: .96, readabilityVersion: 1, foreground: '', background: '', style: 'widget' };
const statePath = () => path.join(app.getPath('userData'), 'widget.json');
function normalize(value = {}) {
  const number = (key, min, max) => Number.isFinite(value[key]) ? Math.round(Math.max(min, Math.min(max, value[key])) * 100) / 100 : defaults[key];
  const width = Math.round(number('width', 180, 1600));
  const lockAspect = value.lockAspect !== false;
  return { width, height: lockAspect ? Math.round(width / aspectRatio) : Math.round(number('height', 60, 1000)), lockAspect, compactVersion: 1,
    originalFace: faces.some(face => face.id === value.originalFace) ? value.originalFace : defaults.originalFace,
    readabilityVersion: 1, opacity: number('opacity', .2, 1), backgroundOpacity: number('backgroundOpacity', 0, 1), style: value.style === 'original' ? 'original' : 'widget', alwaysOnTop: typeof value.alwaysOnTop === 'boolean' ? value.alwaysOnTop : true,
    foreground: /^#[0-9a-f]{6}$/i.test(value.foreground) ? value.foreground : '',
    background: /^#[0-9a-f]{6}$/i.test(value.background) ? value.background : '',
    ...(Number.isFinite(value.x) && Number.isFinite(value.y) ? { x: Math.round(value.x), y: Math.round(value.y) } : {}) };
}
function save() {
  try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); fs.writeFileSync(statePath() + '.tmp', JSON.stringify(state)); fs.renameSync(statePath() + '.tmp', statePath()); }
  catch (error) { dialog.showErrorBox('설정 저장 실패', error.message); }
}
function visibleBounds() {
  const display = screen.getDisplayMatching({ x: state.x ?? 80, y: state.y ?? 80, width: state.width, height: state.height });
  const area = display.workArea;
  const scale = Math.min(1, area.width / state.width, area.height / state.height);
  const width = state.lockAspect ? Math.floor(state.width * scale) : Math.min(state.width, area.width);
  const height = state.lockAspect ? Math.floor(state.height * scale) : Math.min(state.height, area.height);
  return { width, height,
    x: Math.max(area.x, Math.min(state.x ?? area.x + 80, area.x + area.width - width)),
    y: Math.max(area.y, Math.min(state.y ?? area.y + 80, area.y + area.height - height)) };
}
function loginOptions() { return { path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] }; }
function snapshot() { return { ...state, faces, aspectRatio, autoStart: app.getLoginItemSettings(loginOptions()).openAtLogin }; }
function broadcast() {
  for (const win of [clock, settingsWindow]) if (win && !win.isDestroyed()) win.webContents.send('widget:changed', snapshot());
}
function apply() {
  clock.setAlwaysOnTop(state.alwaysOnTop); clock.setOpacity(state.opacity);
  clock.setBounds(visibleBounds()); broadcast(); updateMenu();
}
function loadClock() { clock.loadFile(state.style === 'original' ? path.join(__dirname, '../app/index.html') : path.join(__dirname, 'widget.html')); }
function chooseFace(id) {
  const oldStyle = state.style;
  state.style = id === 'widget' ? 'widget' : 'original';
  if (id !== 'widget') state.originalFace = id;
  if (oldStyle !== state.style) loadClock();
  apply(); save();
}
const webPreferences = () => ({ preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true });
function secure(win) {
  // This offline clock does not need microphone, camera, or device permissions.
  win.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  win.webContents.session.setPermissionCheckHandler(() => false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', event => event.preventDefault());
}
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.show(); settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({ width: 460, height: 760, resizable: false, parent: clock, autoHideMenuBar: true, skipTaskbar: true, title: 'Desk Clock 설정', webPreferences: webPreferences() });
  secure(settingsWindow); settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}
function menuItems() {
  return [{ label: clock.isVisible() ? '시계 숨기기' : '시계 표시', click: () => { clock.isVisible() ? clock.hide() : clock.show(); updateMenu(); } },
    { label: '항상 위에 표시', type: 'checkbox', checked: state.alwaysOnTop, click: item => { state.alwaysOnTop = item.checked; apply(); save(); } },
    { label: '시계 페이스', submenu: [{ label: '민트 LCD 위젯', type: 'radio', checked: state.style === 'widget', click: () => chooseFace('widget') },
      ...faces.map(face => ({ label: face.name, type: 'radio', checked: state.style === 'original' && state.originalFace === face.id, click: () => chooseFace(face.id) }))] },
    { label: '크기', submenu: [[240, '작게'], [360, '보통'], [480, '크게']].map(([width, name]) => ({ label: `${name} · ${width} × ${Math.round(width / aspectRatio)}`, click: () => { state.width = width; state.height = Math.round(width / aspectRatio); state.lockAspect = true; apply(); save(); } })) },
    { label: '설정 열기', click: openSettings }, { type: 'separator' }, { label: '종료', click: () => app.quit() }];
}
function updateMenu() { if (tray) tray.setContextMenu(Menu.buildFromTemplate(menuItems())); }
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (clock) { clock.show(); updateMenu(); } });
  app.whenReady().then(() => {
    try {
      const saved = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
      // Upgrade the faint initial theme once; later transparency choices stay saved.
      state = normalize(saved.readabilityVersion === 1 ? saved : { ...saved, opacity: 1, backgroundOpacity: .96 });
      if (saved.compactVersion !== 1 && ((saved.width === 640 && saved.height === 200) || (saved.width === 440 && saved.height === 260))) {
        state.width = defaults.width; state.height = defaults.height;
      }
    } catch { state = { ...defaults }; }
    clock = new BrowserWindow({ ...visibleBounds(), frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false, skipTaskbar: true, resizable: false, minWidth: 180, minHeight: 60, show: false, webPreferences: webPreferences() });
    secure(clock);
    loadClock();
    clock.once('ready-to-show', () => { apply(); clock.show(); });
    const recordBounds = () => { Object.assign(state, clock.getBounds()); clearTimeout(saveTimer); saveTimer = setTimeout(() => { save(); broadcast(); }, 250); };
    clock.on('move', recordBounds); clock.on('resize', recordBounds);
    clock.webContents.on('context-menu', () => Menu.buildFromTemplate(menuItems()).popup({ window: clock }));
    clock.on('system-context-menu', event => { event.preventDefault(); Menu.buildFromTemplate(menuItems()).popup({ window: clock }); });
    // A PNG generated in memory avoids SVG/ICO platform decoding differences in the tray.
    const pixels = Buffer.alloc(32 * 32 * 4);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const r = Math.hypot(x - 16, y - 16), hand = (Math.abs(x - 16) < 1.5 && y > 7 && y < 18) || (y > 14 && y < 18 && x > 15 && x < 24);
      const i = (y * 32 + x) * 4, light = r > 12 && r < 15 || hand;
      pixels[i] = light ? 255 : 40; pixels[i + 1] = light ? 255 : 40; pixels[i + 2] = light ? 255 : 40; pixels[i + 3] = r < 15 ? 255 : 0;
    }
    tray = new Tray(nativeImage.createFromBitmap(pixels, { width: 32, height: 32 }));
    tray.setToolTip('Desk Clock'); tray.on('double-click', () => { clock.show(); updateMenu(); }); updateMenu();
    screen.on('display-removed', () => { clock.setBounds(visibleBounds()); });
    ipcMain.handle('widget:get', () => snapshot());
    ipcMain.handle('widget:update', (event, patch) => {
      if (!settingsWindow || event.sender !== settingsWindow.webContents) throw new Error('설정 창에서만 변경할 수 있습니다.');
      if (typeof patch.autoStart === 'boolean') {
        app.setLoginItemSettings({ openAtLogin: patch.autoStart, ...loginOptions() });
      }
      const oldStyle = state.style;
      const candidate = { ...state, ...patch, x: state.x, y: state.y };
      if (candidate.lockAspect !== false && Number.isFinite(patch.height) && !Number.isFinite(patch.width)) candidate.width = Math.round(patch.height * aspectRatio);
      state = normalize(candidate);
      if (oldStyle !== state.style) loadClock();
      apply(); save(); return snapshot();
    });
    ipcMain.on('widget:settings', openSettings);
    ipcMain.on('widget:face-changed', (event, id) => {
      if (event.sender !== clock.webContents || state.style !== 'original' || !faces.some(face => face.id === id) || state.originalFace === id) return;
      state.originalFace = id; save(); broadcast(); updateMenu();
    });
  });
  app.on('before-quit', () => { clearTimeout(saveTimer); if (state) save(); });
  app.on('window-all-closed', () => app.quit());
}
