// Natural Earth 1:50m (domena publiczna) → ścieżki SVG Europy w odwzorowaniu LAEA (jak EPSG:3035).
// Wynik: src/data/europe-map.json ({ viewBox, countries: [{ iso, name, d }] }).
// Uruchamiaj: node scripts/build-map.mjs (pobiera geojson, jeśli brak w _zrodla/).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { geoArea, geoAzimuthalEqualArea, geoCentroid, geoPath } from 'd3-geo';
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
// Bez terytoriów zamorskich i dalekich wysp (Gujana, Reunion, Svalbard, Azory, Madera, Kanary),
// inaczej dopasowanie kadru obejmuje pół świata. Filtr po środku każdego wielokąta.
const wEuropie = (poly) => { const [lon, lat] = geoCentroid({ type: 'Polygon', coordinates: poly }); return lon > -25 && lon < 50 && lat > 34 && lat < 72; };
const feats = geo.features.filter((f) => want.has(iso(f.properties))).map((f) => {
  if (f.geometry.type !== 'MultiPolygon' || iso(f.properties) === 'RUS') return f;
  return { ...f, geometry: { type: 'MultiPolygon', coordinates: f.geometry.coordinates.filter(wEuropie) } };
});

let topo = topology({ c: { type: 'FeatureCollection', features: feats } }, 1e5);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.55)); // 55% wierzchołków: ostre wybrzeża przy mapie na całe hero (Retina)
const simplified = feature(topo, topo.objects.c);

// Kadr na hero: 1600×1000. Europa przesunięta w prawo i w górne ~80%: lewy dół (Atlantyk) zostaje na tytuł.
const W = 1600, H = 1000;
const europa = { type: 'FeatureCollection', features: simplified.features.filter((f) => iso(f.properties) !== 'RUS') };
const projection = geoAzimuthalEqualArea().rotate([-15, -53])
  .fitExtent([[300, 6], [1600, 850]], europa).clipExtent([[0, 0], [W, H]]);
const path = geoPath(projection).digits(1);

const countries = simplified.features
  .map((f) => {
    // Środek do kolejności składania i etykiet: centroid największego wielokąta (Francja bez Gujany, Norwegia bez Svalbardu).
    const g = f.geometry.type === 'MultiPolygon'
      ? { type: 'Polygon', coordinates: f.geometry.coordinates.reduce((a, b) => (geoArea({ type: 'Polygon', coordinates: b }) > geoArea({ type: 'Polygon', coordinates: a }) ? b : a)) }
      : f.geometry;
    const c = path.centroid(g).map(Math.round);
    return { iso: iso(f.properties), name: f.properties.NAME_PL || f.properties.NAME, d: path(f), c };
  })
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
  bbox: geoPath(projection).bounds(europa).flat().map(Math.round),
  dots,
  source: 'Natural Earth 1:50m Admin 0 – Countries (domena publiczna)',
  countries,
}));
const kb = Math.round(JSON.stringify(countries).length / 1024);
console.log(`europe-map.json: ${countries.length} państw, ${kb} KB`);
