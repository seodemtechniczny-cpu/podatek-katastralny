import mapa from '../data/europe-map.json';
import stats from '../data/stats.json';

type Stat = { total_gdp?: { value: number; year: number }; total_tax?: { value: number; year: number } };
export type Dane = { n: string; g?: number; t?: number; y?: number };

const S = stats.countries as Record<string, Stat>;
const PROGI = [0.25, 0.5, 1, 1.5, 2];

export const klasa = (v?: number) => {
  if (v === undefined) return 'none';
  const i = PROGI.findIndex((p) => v < p);
  return `m${i === -1 ? 5 : i}`;
};
export const pct = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
export const legenda = [['m0', '< 0,25%'], ['m1', '0,25–0,5%'], ['m2', '0,5–1%'], ['m3', '1–1,5%'], ['m4', '1,5–2%'], ['m5', '≥ 2%'], ['none', 'brak danych']];

// Malta ginie przy uproszczeniu, więc istnieje tylko jako punkt; pozostałe punkty to pomoc dla myszy.
export const maKsztalt = new Set(mapa.countries.map((c) => c.iso));
export const panstwa = [
  ...mapa.countries.filter((c) => c.iso !== 'RUS'),
  ...mapa.dots.filter((d) => !maKsztalt.has(d.iso)).map((d) => ({ iso: d.iso, name: d.name, d: '', c: [d.x, d.y] })),
];
export const dane: Record<string, Dane> = Object.fromEntries(panstwa.map((c) => {
  const s = S[c.iso];
  return [c.iso, { n: c.name, g: s?.total_gdp?.value, t: s?.total_tax?.value, y: s?.total_gdp?.year }];
}));
export const etykieta = (iso: string) => {
  const d = dane[iso];
  return d.g === undefined ? `${d.n}: brak danych` : `${d.n}: ${pct(d.g)} PKB (${d.y})`;
};

// Kolejność składania mapy w hero: zachód, wschód, północ, południe, na końcu Polska.
export const GRUPY: Record<string, string[]> = {
  zachod: ['PRT', 'ESP', 'AND', 'FRA', 'BEL', 'NLD', 'LUX', 'GBR', 'IRL', 'DEU', 'CHE', 'LIE', 'AUT'],
  wschod: ['CZE', 'SVK', 'HUN', 'BLR', 'UKR', 'MDA', 'ROU', 'RUS'],
  polnoc: ['ISL', 'NOR', 'SWE', 'FIN', 'DNK', 'EST', 'LVA', 'LTU'],
  poludnie: ['ITA', 'MLT', 'SVN', 'HRV', 'BIH', 'SRB', 'MNE', 'XKX', 'ALB', 'MKD', 'GRC', 'BGR', 'TUR', 'CYP'],
};
export const grupa = (iso: string) => Object.keys(GRUPY).find((g) => GRUPY[g].includes(iso)) ?? 'poludnie';

export { mapa, stats };
