const tick = window.createMintLCD(document.getElementById('digits'));
function rgb(hex) { return [1,3,5].map(offset => parseInt(hex.slice(offset,offset+2),16)).join(' '); }
function render(state) {
  const style = document.documentElement.style;
  style.setProperty('--digit-color', state.foreground || '#10291f');
  style.setProperty('--panel-rgb', rgb(state.background || '#d6f4e3'));
  style.setProperty('--rim-rgb', rgb(state.background || '#438b69'));
  style.setProperty('--panel-alpha', state.backgroundOpacity);
  style.setProperty('--rim-alpha', Math.min(1,state.backgroundOpacity + .17));
}
window.desktopWidget.onChange(render); window.desktopWidget.get().then(render);
tick(); setInterval(tick, 200);
