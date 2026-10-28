const api = window.desktopWidget;
const ids = ['alwaysOnTop', 'autoStart', 'width', 'height', 'foreground', 'background', 'opacity', 'backgroundOpacity', 'lockAspect'];
let currentState;
function render(state) {
  currentState = state;
  const choice = document.getElementById('faceChoice');
  if (choice.options.length === 1) for (const face of state.faces) choice.add(new Option(face.name, face.id));
  choice.value = state.style === 'widget' ? 'widget' : state.originalFace;
  document.getElementById('size').value = state.width;
  document.getElementById('sizeValue').value = `${state.width} × ${state.height}`;
  for (const id of ids) {
    const input = document.getElementById(id);
    if (input.type === 'checkbox') input.checked = state[id];
    else input.value = state[id] || (id === 'foreground' ? (state.style === 'widget' ? '#10291f' : '#ffffff') : id === 'background' ? (state.style === 'widget' ? '#d6f4e3' : '#171a20') : state[id]);
  }
  document.getElementById('opacityValue').value = `${Math.round(state.opacity * 100)}%`;
  document.getElementById('backgroundOpacityValue').value = `${Math.round(state.backgroundOpacity * 100)}%`;
}
async function update(patch) {
  try { render(await api.update(patch)); document.getElementById('status').textContent = '저장되었습니다.'; }
  catch (error) { document.getElementById('status').textContent = `저장 실패: ${error.message}`; }
}
for (const id of ids) document.getElementById(id).addEventListener('change', event => {
  const input = event.target;
  if (!input.checkValidity()) { input.reportValidity(); return; }
  update({ [id]: input.type === 'checkbox' ? input.checked : ['number', 'range'].includes(input.type) ? Number(input.value) : input.value });
});
document.getElementById('opacity').addEventListener('input', event => { document.getElementById('opacityValue').value = `${Math.round(event.target.value * 100)}%`; });
document.getElementById('backgroundOpacity').addEventListener('input', event => { document.getElementById('backgroundOpacityValue').value = `${Math.round(event.target.value * 100)}%`; });
document.getElementById('resetColors').onclick = () => update({ foreground: '', background: '' });
document.getElementById('faceChoice').onchange = event => update(event.target.value === 'widget' ? { style: 'widget' } : { style: 'original', originalFace: event.target.value });
const size = document.getElementById('size');
function scaledSize() { return { width: Number(size.value), height: Math.max(60, Math.min(1000, Math.round(Number(size.value) / (currentState.lockAspect ? currentState.aspectRatio : currentState.width / currentState.height)))) }; }
size.oninput = () => { const value = scaledSize(); document.getElementById('sizeValue').value = `${value.width} × ${value.height}`; };
size.onchange = () => update(scaledSize());
api.onChange(render); api.get().then(render);
