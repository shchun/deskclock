// 앱 런처 아이콘 소스(PNG)를 SVG에서 렌더링한다. (실행: node generate-icons.js)
// 이후 `npx capacitor-assets generate --android` 로 안드로이드 아이콘을 생성.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'assets');
fs.mkdirSync(dir, { recursive: true });

const BG = '#0c0c0e';
const ACCENT = '#f3b14e';

// 중심(512,512), 반지름 300인 미니멀 시계 — 10:10 바늘, 12/3/6/9 눈금
function clock() {
  return `
  <g fill="none" stroke="#ffffff" stroke-linecap="round">
    <circle cx="512" cy="512" r="300" stroke-width="40"/>
    <g stroke-width="34">
      <line x1="512" y1="244" x2="512" y2="300"/>
      <line x1="512" y1="724" x2="512" y2="780"/>
      <line x1="244" y1="512" x2="300" y2="512"/>
      <line x1="724" y1="512" x2="780" y2="512"/>
    </g>
    <line x1="512" y1="512" x2="389" y2="426" stroke-width="44"/>
    <line x1="512" y1="512" x2="694" y2="407" stroke-width="44"/>
  </g>
  <circle cx="512" cy="512" r="30" fill="#ffffff"/>
  <circle cx="512" cy="512" r="14" fill="${ACCENT}"/>`;
}

const full = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="220" fill="${BG}"/>${clock()}</svg>`;
// 적응형 아이콘 전경: 안전영역 안에 들어오도록 0.8배 축소, 배경 투명
const fg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><g transform="translate(512 512) scale(0.8) translate(-512 -512)">${clock()}</g></svg>`;
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${BG}"/></svg>`;

async function render(svg, name) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, name));
  console.log('  ' + name);
}
(async () => {
  await render(full, 'icon-only.png');
  await render(fg, 'icon-foreground.png');
  await render(bg, 'icon-background.png');
  console.log('done');
})();
