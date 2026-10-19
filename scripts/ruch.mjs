// Ruch z Cloudflare Web Analytics (GraphQL). Użycie: npm run ruch [-- --dni=7]
// Token (uprawnienie Account Analytics: Read) z CF_API_TOKEN albo z ~/.config/podatek-katastralny/cloudflare-token
// (chmod 600, poza repo).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

const KONTO = 'a5274c5e9e0b9ee3a43b80a9cf5c627e';
const STRONA = 'e7eca87603a74c12bacef112afac3b9b'; // siteTag podatek-katastralny.pl, nie token beacona
const dni = +(process.argv.find((a) => a.startsWith('--dni='))?.slice(6) ?? 7);

const token = process.env.CF_API_TOKEN
  || readFileSync(`${homedir()}/.config/podatek-katastralny/cloudflare-token`, 'utf8').trim();
if (!token) { console.error('Brak tokenu: wklej go do ~/.config/podatek-katastralny/cloudflare-token'); process.exit(1); }

const dzien = (d) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
const od = dzien(dni - 1), do_ = dzien(0);

const grupa = (alias, limit, wymiary, kolejnosc) =>
  `${alias}: rumPageloadEventsAdaptiveGroups(limit: ${limit}, filter: {siteTag: $s, date_geq: $od, date_leq: $do}, orderBy: [${kolejnosc}]) { count sum { visits } dimensions { ${wymiary} } }`;

const query = `query($a: string, $s: string, $od: Date, $do: Date) { viewer { accounts(filter: {accountTag: $a}) {
  ${grupa('dni', 100, 'date', 'date_ASC')}
  ${grupa('strony', 15, 'requestPath', 'count_DESC')}
  ${grupa('zrodla', 15, 'refererHost', 'sum_visits_DESC')}
  ${grupa('urzadzenia', 5, 'deviceType', 'count_DESC')}
  ${grupa('kraje', 5, 'countryName', 'count_DESC')}
} } }`;

const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST',
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ query, variables: { a: KONTO, s: STRONA, od, do: do_ } }),
});
const j = await res.json();
if (j.errors?.length) { console.error(j.errors.map((e) => e.message).join('\n')); process.exit(1); }
const k = j.data.viewer.accounts[0];

const tabela = (tytul, wiersze, klucz) => {
  console.log(`\n${tytul}`);
  for (const w of wiersze) console.log(`  ${String(w.dimensions[klucz] || '(bezpośrednio)').padEnd(44)} ${String(w.sum?.visits ?? '').padStart(5)} wizyt  ${String(w.count).padStart(5)} odsłon`);
};

const suma = (pole) => k.dni.reduce((s, w) => s + (pole === 'count' ? w.count : w.sum.visits), 0);
console.log(`podatek-katastralny.pl, ${od} – ${do_}: ${suma('visits')} wizyt, ${suma('count')} odsłon`);
tabela('Dni', k.dni, 'date');
tabela('Strony', k.strony, 'requestPath');
tabela('Źródła', k.zrodla, 'refererHost');
tabela('Urządzenia', k.urzadzenia, 'deviceType');
tabela('Kraje', k.kraje, 'countryName');
