// Pobiera z OECD (Global Revenue Statistics, SDMX) wpływy z cyklicznych podatków od nieruchomości:
// kategoria 4100, jako % PKB i % wszystkich podatków. Bez podziału 4110/4120: część krajów (np. Polska)
// raportuje całość w 4120, więc „gospodarstwa domowe 0%" wprowadzałoby w błąd.
// Wynik: src/data/stats.json. Uruchamiaj: node scripts/fetch-stats.mjs
import { writeFileSync } from 'node:fs';

import { ISO3 } from './kraje.mjs';

const BASE = 'https://sdmx.oecd.org/public/rest/data/OECD.CTP.TPS,DSD_REV_COMP_GLOBAL@DF_RSGLOBAL,';
const SERIES = { T_4100: 'total' };
const UNITS = { PT_B1GQ: 'gdp', PT_OTR_SECTOR: 'tax' };

// Bez listy krajów w adresie: długi filtr REF_AREA daje 500, więc kraje filtrujemy lokalnie.
const url = `${BASE}/.TAX_REV.S13.${Object.keys(SERIES).join('+')}._T.${Object.keys(UNITS).join('+')}.A?startPeriod=2015&dimensionAtObservation=AllDimensions&format=csvfile`;
// OECD odpowiada 500 na domyślny nagłówek Node `accept-language: *`, stąd jawny język.
// Trzy próby co 5 s na wypadek przeciążenia (429/503).
let res;
for (let i = 0; i < 3; i++) {
  res = await fetch(url, { headers: { 'accept-language': 'en' } });
  if (res.ok) break;
  await new Promise((r) => setTimeout(r, 5000));
}
if (!res.ok) throw new Error(`OECD ${res.status}`);
const [head, ...rows] = (await res.text()).trim().split('\n').map((l) => l.split(','));
const col = Object.fromEntries(head.map((h, i) => [h, i]));

const out = {};
for (const r of rows) {
  const v = r[col.OBS_VALUE];
  if (v === '') continue;
  const iso = r[col.REF_AREA], year = +r[col.TIME_PERIOD];
  if (!ISO3.includes(iso)) continue;
  const key = `${SERIES[r[col.STANDARD_REVENUE]]}_${UNITS[r[col.UNIT_MEASURE]]}`;
  const c = (out[iso] ??= {});
  if (!c[key] || year > c[key].year) c[key] = { value: Math.round(+v * 100) / 100, year };
}

writeFileSync('src/data/stats.json', JSON.stringify({
  source: 'OECD, Global Revenue Statistics — Comparative tax revenues (DF_RSGLOBAL), kategoria 4100',
  url: 'https://data-explorer.oecd.org/',
  fetched: new Date().toISOString().slice(0, 10),
  countries: out,
}, null, 1));
console.log(`stats.json: ${Object.keys(out).length} krajów z danymi`);
