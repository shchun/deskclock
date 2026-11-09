const { invoke } = window.__TAURI__.core;
const ipcRenderer = {
  invoke: (name, patch) => invoke(name === 'widget:get' ? 'get_state' : 'update_state', { patch }),
  on: (_name, callback) => window.addEventListener('widget:changed', event => callback(null, event.detail)),
  send: (name, value) => {
    const commands = { 'widget:settings': 'open_settings', 'widget:cycle': 'cycle_face', 'widget:face-changed': 'face_changed' };
    if (commands[name]) invoke(commands[name], { value }).catch(console.error);
  }
};
const contextBridge = { exposeInMainWorld: (key, value) => { window[key] = value; } };
contextBridge.exposeInMainWorld('desktopWidget', {
  get: () => ipcRenderer.invoke('widget:get'),
  update: patch => ipcRenderer.invoke('widget:update', patch),
  settings: () => ipcRenderer.send('widget:settings'),
  onChange: callback => ipcRenderer.on('widget:changed', (_event, state) => callback(state))
});
window.addEventListener('DOMContentLoaded', () => {
  const isOriginal = location.pathname.endsWith('/index.html');
  const isWidget = location.pathname.endsWith('/widget.html');
  if (isOriginal || isWidget) {
    let pointer = null;
    const root = document.documentElement;
    const drag = (phase, event) => invoke('drag_window', { phase, x: event.screenX, y: event.screenY }).catch(console.error);
    window.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest?.('button,a,input,select,textarea,[role="button"]')) return;
      event.preventDefault();
      pointer = event.pointerId;
      root.setPointerCapture(pointer);
      drag('start', event);
    }, true);
    window.addEventListener('pointermove', event => {
      if (event.pointerId === pointer) drag('move', event);
    }, true);
    const finish = event => {
      if (event.pointerId !== pointer) return;
      drag('end', event);
      const id = pointer; pointer = null;
      if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    };
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', finish, true);
    window.addEventListener('click', event => {
      if (event.target.closest?.('button,a,input,select,textarea,[role="button"]')) return;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
    window.addEventListener('contextmenu', event => { event.preventDefault(); invoke('show_menu').catch(console.error); });
    const opacity = state => { document.body.style.opacity = state.opacity; };
    window.desktopWidget.onChange(opacity);
    window.desktopWidget.get().then(opacity);
  }
  if (isOriginal || isWidget) window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    // Capture before the web clock's Android-only face cycling handler.
    event.stopImmediatePropagation();
    ipcRenderer.send('widget:cycle', event.key === 'ArrowRight' ? 1 : -1);
  }, true);
  if (!location.pathname.endsWith('/index.html')) return;
  const frameStyle = document.createElement('link');
  frameStyle.rel = 'stylesheet';
  frameStyle.href = new URL('../desktop/widget-frame.css', location.href).href;
  document.head.append(frameStyle);
  const stage = document.getElementById('stage');
  stage.classList.add('widget-frame');
  const style = document.createElement('style');
  style.textContent = `html,body,body.widget-bg{background:transparent!important}
    .stage.widget-frame{inset:7px;overflow:hidden}
    body.widget-fg .face,body.widget-fg .face *{color:var(--widget-fg)!important}
    body.widget-bg .face{background:var(--widget-bg)!important}`;
  document.head.append(style);
  document.addEventListener('deskclock:face-changed', event => ipcRenderer.send('widget:face-changed', event.detail));
  const render = state => {
    document.body.classList.toggle('widget-fg', !!state.foreground); document.body.classList.toggle('widget-bg', !!state.background);
    document.body.style.setProperty('--widget-fg', state.foreground); document.body.style.setProperty('--widget-bg', state.background);
    const face = state.faces.find(item => item.id === state.originalFace);
    document.documentElement.style.setProperty('--widget-border-color', face?.borderColor || '#438b69');
    document.dispatchEvent(new CustomEvent('deskclock:select-face', { detail: state.originalFace }));
  };
  ipcRenderer.on('widget:changed', (_event, state) => render(state));
  ipcRenderer.invoke('widget:get').then(render);
  // The frame stylesheet arrives after the web clock's initial fit.
  frameStyle.addEventListener('load', () => window.dispatchEvent(new Event('resize')));
});
