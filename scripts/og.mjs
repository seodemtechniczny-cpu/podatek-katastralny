// Grafika do udostępniania linku (Open Graph 1200×630) → public/og.png.
// Ten sam kadr mapy i kolory co hero. Bez dat i stanu sprawy, żeby się nie zestarzała.
// Uruchamiaj lokalnie: node scripts/og.mjs (potrzebny Chrome i playwright-core z cache npx).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';

const mapa = JSON.parse(readFileSync('src/data/europe-map.json', 'utf8'));
const podstawa = JSON.parse(readFileSync('src/data/podstawa.json', 'utf8')).kraje;
const KOLOR = { wartosc: '#3a3834', powierzchnia: '#d6d2ca', mieszany: 'url(#mieszany)', brak: '#fbfaf8' };
const [x0, y0, x1, y1] = mapa.bbox;
const pol = mapa.countries.find((c) => c.iso === 'POL');
const kraje = mapa.countries.filter((c) => c.iso !== 'POL').map((c) => {
  const fill = c.iso === 'RUS' ? '#efede8' : KOLOR[podstawa[c.iso]?.podstawa] ?? '#efede8';
  return `<path d="${c.d}" fill="${fill}" stroke="#fbfaf8" stroke-width="1.2"/>`;
}).join('');
const ile = (k) => Object.values(podstawa).filter((p) => p.podstawa === k).length;
const font = resolve('node_modules/@fontsource-variable/geist/files/geist-latin-ext-wght-normal.woff2');
const fontLatin = resolve('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');

const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>
@font-face { font-family: G; src: url(file://${fontLatin}) format('woff2'); font-weight: 100 900; unicode-range: U+0000-00FF; }
@font-face { font-family: G; src: url(file://${font}) format('woff2'); font-weight: 100 900; unicode-range: U+0100-024F; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #fbfaf8; font-family: G, sans-serif; color: #121212; position: relative; overflow: hidden; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(18,18,18,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(18,18,18,.05) 1px, transparent 1px); background-size: 60px 60px; }
svg.m { position: absolute; right: -70px; top: 0; height: 630px; width: auto; }
.txt { position: absolute; left: 60px; top: 60px; bottom: 54px; width: 470px; display: flex; flex-direction: column; }
.logo { display: flex; align-items: center; gap: 12px; font-size: 26px; font-weight: 650; letter-spacing: -0.01em; }
.logo i { width: 40px; height: 40px; background: #c8102e; border-radius: 5px; display: grid; place-items: center; }
.logo span { color: #565a61; font-weight: 500; }
h1 { margin-top: auto; font-size: 68px; line-height: .98; letter-spacing: -0.045em; font-weight: 660; }
p { margin-top: 24px; font-size: 23px; line-height: 1.35; color: #303338; max-width: 420px; }
.lg { margin-top: 26px; display: flex; gap: 20px; font-size: 18px; color: #303338; }
.lg b { display: inline-block; width: 18px; height: 13px; margin-right: 8px; vertical-align: -1px; border: 1px solid #cbc7bf; }
</style></head><body>
<div class="grid"></div>
<svg class="m" viewBox="${x0 - 30} ${y0 - 10} ${x1 - x0 + 60} ${y1 - y0 + 30}" xmlns="http://www.w3.org/2000/svg">
<defs>
 <pattern id="mieszany" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#d6d2ca"/><rect width="4" height="9" fill="#3a3834"/></pattern>
 <radialGradient id="pl" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#ef3a55"/><stop offset="1" stop-color="#c8102e"/></radialGradient>
</defs>
${kraje}
${[1, 2, 3, 4, 5, 6, 7].map((k) => `<path d="${pol.d}" fill="#7a0a1c" transform="translate(0 ${k - 7})"/>`).join('')}
<path d="${pol.d}" fill="url(#pl)" stroke="#fbfaf8" stroke-width="1.4" transform="translate(0 -7)"/>
</svg>
<div class="txt">
 <div class="logo"><i><svg width="26" height="26" viewBox="0 0 32 32"><path d="M6 8h20M6 16h12M18 16v10M6 24h20M13 8v8M22 16v8" stroke="#fff" stroke-width="2.4" fill="none"/></svg></i><em style="font-style:normal">podatek-katastralny<span>.pl</span></em></div>
 <h1>Czy będzie podatek katastralny w&nbsp;Polsce?</h1>
 <p>Stan prac w Sejmie, kalkulator i porównanie z Europą. Bezstronnie, ze&nbsp;źródłami.</p>
 <div class="lg"><span><b style="background:#3a3834"></b>od wartości: ${ile('wartosc')}</span><span><b style="background:#d6d2ca"></b>od m²: ${ile('powierzchnia')}</span><span><b style="background:#c8102e;border-color:#c8102e"></b>Polska</span></div>
</div>
</body></html>`;

mkdirSync('_og', { recursive: true });
writeFileSync('_og/og.html', html);

const require = createRequire(import.meta.url);
const pw = globSync(`${process.env.HOME}/.npm/_npx/*/node_modules/playwright-core`)[0];
const { chromium } = require(pw);
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto('file://' + resolve('_og/og.html'));
await p.evaluate(() => document.fonts.ready);
console.log(await p.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.status}`).join(', ')));
await p.screenshot({ path: 'public/og.png' });
await b.close();
console.log('public/og.png gotowe');
