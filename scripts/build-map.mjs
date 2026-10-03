// Natural Earth 1:50m (domena publiczna) → ścieżki SVG Europy w odwzorowaniu LAEA (jak EPSG:3035).
// Wynik: src/data/europe-map.json ({ viewBox, countries: [{ iso, name, d }] }).
// Uruchamiaj: node scripts/build-map.mjs (pobiera geojson, jeśli brak w _zrodla/).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { geoAzimuthalEqualArea, geoPath } from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { feature } from 'topojson-client';
import { ISO3 } from './kraje.mjs';

const SRC = '_zrodla/ne50.geojson';
if (!existsSync(SRC)) {
  const r = await fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson');
  writeFileSync(SRC, await r.text());
}
const geo = JSON.parse(readFileSync(SRC, 'utf8'));

// Natural Earth ma -99 w ISO_A3 dla Francji, Norwegii i Kosowa; ADM0_A3 jest pełne.
const iso = (p) => (p.ADM0_A3 === 'KOS' ? 'XKX' : p.ADM0_A3);
const want = new Set([...ISO3, 'RUS']); // Rosja tylko jako tło, bez danych
const feats = geo.features.filter((f) => want.has(iso(f.properties)));

let topo = topology({ c: { type: 'FeatureCollection', features: feats } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.18)); // ponytail: 18% wierzchołków wystarcza przy ~900 px; Malta i Andora zostają
const simplified = feature(topo, topo.objects.c);

const W = 1000, H = 860;
// Kadr: od Islandii i Portugalii po Ukrainę i Turcję, bez Syberii.
const projection = geoAzimuthalEqualArea().rotate([-12, -52]).center([0, 0])
  .scale(1180).translate([W / 2 - 40, H / 2 + 10]).clipExtent([[0, 0], [W, H]]);
const path = geoPath(projection).digits(1);

const countries = simplified.features
  .map((f) => ({ iso: iso(f.properties), name: f.properties.NAME_PL || f.properties.NAME, d: path(f) }))
  .filter((c) => c.d)
  .sort((a, b) => (a.iso === 'RUS' ? -1 : b.iso === 'RUS' ? 1 : a.name.localeCompare(b.name, 'pl')));

// Mikropaństwa giną przy uproszczeniu albo mają kilka pikseli: dostają punkt do najechania.
const DOTS = { MLT: [14.44, 35.9], LIE: [9.55, 47.15], AND: [1.6, 42.55], LUX: [6.13, 49.7] };
const dots = Object.entries(DOTS).map(([iso, ll]) => {
  const [x, y] = projection(ll);
  const f = feats.find((g) => iso === (g.properties.ADM0_A3));
  return { iso, name: f.properties.NAME_PL || f.properties.NAME, x: Math.round(x), y: Math.round(y) };
});

writeFileSync('src/data/europe-map.json', JSON.stringify({
  viewBox: `0 0 ${W} ${H}`,
  dots,
  source: 'Natural Earth 1:50m Admin 0 – Countries (domena publiczna)',
  countries,
}));
const kb = Math.round(JSON.stringify(countries).length / 1024);
console.log(`europe-map.json: ${countries.length} państw, ${kb} KB`);
