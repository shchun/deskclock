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
  if (isOriginal || isWidget) window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    // Capture before the web clock's Android-only face cycling handler.
    event.stopImmediatePropagation();
    ipcRenderer.send('widget:cycle', event.key === 'ArrowRight' ? 1 : -1);
  }, true);
  if (!location.pathname.endsWith('/index.html')) return;
  const style = document.createElement('style');
  style.textContent = `body::after{content:'';position:fixed;inset:0;z-index:9998;-webkit-app-region:drag}
    #widget-tools{position:fixed;right:8px;top:8px;z-index:9999;display:flex;gap:4px;-webkit-app-region:no-drag;opacity:.15}
    #widget-tools:hover,#widget-tools:focus-within{opacity:1}
    #widget-tools button{border:1px solid #888;border-radius:6px;background:#222;color:#fff;padding:5px 9px;cursor:pointer}
    body.widget-fg .face,body.widget-fg .face *{color:var(--widget-fg)!important}
    body.widget-bg,body.widget-bg .face{background:var(--widget-bg)!important}`;
  document.head.append(style);
  const tools = document.createElement('div'); tools.id = 'widget-tools';
  const next = document.createElement('button'); next.textContent = '다음 시계';
  next.onclick = () => ipcRenderer.send('widget:cycle', 1);
  const settings = document.createElement('button'); settings.textContent = '설정'; settings.onclick = () => ipcRenderer.send('widget:settings');
  tools.append(next, settings); document.body.append(tools);
  document.addEventListener('deskclock:face-changed', event => ipcRenderer.send('widget:face-changed', event.detail));
  const render = state => {
    document.body.classList.toggle('widget-fg', !!state.foreground); document.body.classList.toggle('widget-bg', !!state.background);
    document.body.style.setProperty('--widget-fg', state.foreground); document.body.style.setProperty('--widget-bg', state.background);
    document.dispatchEvent(new CustomEvent('deskclock:select-face', { detail: state.originalFace }));
  };
  ipcRenderer.on('widget:changed', (_event, state) => render(state));
  ipcRenderer.invoke('widget:get').then(render);
});
