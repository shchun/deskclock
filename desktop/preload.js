const { contextBridge, ipcRenderer } = require('electron');
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
    // Native app-region:drag swallows mouse events on some Windows versions.
    // Capture only left-button drags so normal right-click context menus still work.
    let pointer = null;
    const root = document.documentElement;
    const interactive = target => !!target.closest?.('button,a,input,select,textarea,[role="button"]');
    const finish = () => {
      if (pointer === null) return;
      const id = pointer; pointer = null;
      ipcRenderer.send('widget:drag-end');
      if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    };
    window.addEventListener('pointerdown', event => {
      if (event.button !== 0 || interactive(event.target)) return;
      event.preventDefault();
      pointer = event.pointerId;
      root.setPointerCapture(pointer);
      ipcRenderer.send('widget:drag-start', { x: event.screenX, y: event.screenY });
    }, true);
    window.addEventListener('pointermove', event => {
      if (event.pointerId !== pointer) return;
      if (!(event.buttons & 1)) { finish(); return; }
      ipcRenderer.send('widget:drag-move');
    }, true);
    window.addEventListener('pointerup', event => { if (event.pointerId === pointer && event.button === 0) finish(); }, true);
    window.addEventListener('pointercancel', finish, true);
    window.addEventListener('lostpointercapture', finish, true);
    window.addEventListener('blur', finish);
    window.addEventListener('click', event => {
      if (interactive(event.target)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    }, true);
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
