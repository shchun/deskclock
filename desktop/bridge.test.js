const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('Tauri bridge connects settings and clock input without cycling Android handlers', async () => {
  const listeners = {}, calls = [];
  const state = { opacity: .75 };
  const window = {
    __TAURI__: { core: { invoke: async (command, args) => { calls.push({ command, args }); return state; } } },
    addEventListener: (event, callback) => { (listeners[event] ||= []).push(callback); }
  };
  const document = { body: { style: {} }, documentElement: { setPointerCapture() {}, hasPointerCapture() { return false; } } };
  vm.runInNewContext(fs.readFileSync(require.resolve('./bridge'), 'utf8'), { window, document, location: { pathname: '/desktop/widget.html' }, console });
  await window.desktopWidget.update({ width: 480 });
  assert.equal(calls[0].command, 'update_state');
  assert.equal(calls[0].args.patch.width, 480);
  listeners.DOMContentLoaded[0]();
  await Promise.resolve();
  assert.equal(document.body.style.opacity, .75);
  let prevented = false, stopped = false;
  listeners.keydown[0]({ key: 'ArrowRight', preventDefault() { prevented = true; }, stopImmediatePropagation() { stopped = true; } });
  assert.ok(prevented && stopped);
  assert.equal(calls.at(-1).command, 'cycle_face');
  assert.equal(calls.at(-1).args.value, 1);
  const target = { closest: () => null };
  listeners.pointerdown[0]({ button: 0, target, pointerId: 1, screenX: 100, screenY: 80, preventDefault() {} });
  assert.equal(calls.at(-1).command, 'drag_window');
  assert.equal(calls.at(-1).args.phase, 'start');
  listeners.pointermove[0]({ pointerId: 1, screenX: 140, screenY: 100 });
  assert.equal(calls.at(-1).args.phase, 'move');
  listeners.pointerup[0]({ pointerId: 1, screenX: 140, screenY: 100 });
  assert.equal(calls.at(-1).args.phase, 'end');
  listeners.contextmenu[0]({ preventDefault() {} });
  assert.equal(calls.at(-1).command, 'show_menu');
  const count = calls.length;
  listeners.pointerdown[0]({ button: 2, target });
  assert.equal(calls.length, count);
});
