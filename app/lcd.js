// Shared seven-segment display for Android and the Windows widget.
window.createMintLCD = function(svg) {
const ns = 'http://www.w3.org/2000/svg';
const points = ['9,4 63,4 69,10 62,16 10,16 4,10', '66,18 72,12 77,18 77,52 71,58 65,52', '71,64 77,70 77,104 71,110 65,104 65,70', '10,106 62,106 68,112 62,118 10,118 4,112', '2,64 8,70 8,104 2,110 -4,104 -4,70', '2,12 8,18 8,52 2,58 -4,52 -4,18', '10,55 62,55 69,61 62,67 10,67 3,61'];
const masks = [63,6,91,79,102,109,125,7,127,111];
const groups = [];
const positions = [10,102,222,314,434,526];
for (const x of positions) {
  const group = document.createElementNS(ns, 'g'); group.setAttribute('transform', `translate(${x},0)`);
  const segments = points.map(point => { const polygon = document.createElementNS(ns, 'polygon'); polygon.setAttribute('points', point); polygon.setAttribute('class', 'segment'); group.append(polygon); return polygon; });
  groups.push(segments); svg.append(group);
}
for (const x of [199,411]) for (const y of [35,86]) {
  const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 5); dot.setAttribute('class', 'colon'); svg.append(dot);
}
function tick() {
  const now = new Date();
  const text = [now.getHours(),now.getMinutes(),now.getSeconds()].map(value => String(value).padStart(2,'0')).join('');
  groups.forEach((segments,index) => segments.forEach((segment,bit) => segment.classList.toggle('on', !!(masks[Number(text[index])] & (1 << bit)))));
  svg.setAttribute('aria-label', `${text.slice(0,2)}:${text.slice(2,4)}:${text.slice(4)}`);
}

return tick;
};
