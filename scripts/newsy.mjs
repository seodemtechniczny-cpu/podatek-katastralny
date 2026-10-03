// Najnowsze nagłówki mediów o podatku katastralnym → src/data/newsy.json.
// Uruchamiaj: node scripts/newsy.mjs (GitHub Actions co 3 godziny).
//
// Źródła (sprawdzone 03.10.2026):
// - Google News RSS dla frazy „podatek katastralny”: jedyne źródło, które zbiera temat ze wszystkich redakcji
//   (ok. 25 mediów w 100 wynikach). Bierzemy tylko media z listy MEDIA, bez kancelarii i firm doradczych.
// - kanały RSS redakcji: w ostatnich 15–50 wpisach zwykle zero trafień, ale łapią nowe teksty od razu.
// Pokazujemy wyłącznie tytuł, nazwę źródła, datę i link. Bez leadów i treści (prawo autorskie i prasowe).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const PLIK = 'src/data/newsy.json';
const TEMAT = /katastr|podat\w* od wartości nieruchomo/i;
const GOOGLE = 'https://news.google.com/rss/search?q=%22podatek+katastralny%22&hl=pl&gl=PL&ceid=PL:pl';
const KANALY = {
  'Bankier.pl': 'https://www.bankier.pl/rss/wiadomosci.xml',
  'Money.pl': 'https://www.money.pl/rss/rss.xml',
  'Business Insider Polska': 'https://businessinsider.com.pl/.feed',
  'Rzeczpospolita': 'https://www.rp.pl/rss_main',
  'Interia Biznes': 'https://biznes.interia.pl/feed',
  'PolsatNews.pl': 'https://www.polsatnews.pl/rss/wszystkie.xml',
  'Prawo.pl': 'https://www.prawo.pl/rss/podatki.xml',
};
// Media o różnych liniach redakcyjnych. Źródło spoza listy nie trafia na stronę.
const MEDIA = new Set(['Money.pl', 'Forsal.pl', 'Interia Biznes', 'Interia Wydarzenia', 'INFOR.PL', 'wnp.pl',
  'Business Insider Polska', 'Fakt', 'Gazeta Prawna', 'edgp.gazetaprawna.pl', 'polskieradio.pl', 'Polskie Radio 24',
  'Portal Samorządowy', 'Murator.pl', 'Biznes Wprost', 'Wprost', 'OKO.press', 'PolsatNews.pl', 'Polsat News',
  'Bankier.pl', 'Bezprawnik', 'Do Rzeczy', 'GEOFORUM', 'Wyborcza.biz', 'Gazeta Wyborcza', 'Super Biznes',
  'Super Express', 'Rzeczpospolita', 'rp.pl', 'PAP', 'PAP Biznes', 'TVN24', 'tvn24.pl', 'TVN24 Biznes', 'Onet',
  'Onet Biznes', 'wPolityce', 'wPolityce.pl', 'RMF FM', 'RMF24', 'Radio ZET', 'Dziennik.pl', 'Newsweek Polska',
  'Puls Biznesu', 'Parkiet', 'TVP Info', 'Prawo.pl', 'Business Insider', 'Dziennik Gazeta Prawna', 'Spider\'s Web',
  'Gazeta.pl', 'next.gazeta.pl', 'Polityka', 'Tygodnik Powszechny', 'Notes from Poland', 'Strefa Inwestorów']);

const encje = (s) => s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').trim();
const pole = (x, tag) => { const m = x.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)); return m ? encje(m[1]) : ''; };
const klucz = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 80);

async function pobierz(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'podatek-katastralny.pl (headlines with source links)', 'accept-language': 'pl' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return [...(await r.text()).matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
}

const nowe = [];
try {
  for (const it of await pobierz(GOOGLE)) {
    const zrodlo = pole(it, 'source');
    if (!MEDIA.has(zrodlo)) continue;
    // Google dopisuje „ - Źródło” na końcu tytułu.
    const tytul = pole(it, 'title').replace(new RegExp(`\\s+-\\s+${zrodlo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    nowe.push({ tytul, zrodlo, url: pole(it, 'link'), data: new Date(pole(it, 'pubDate')).toISOString() });
  }
} catch (e) { console.error('Google News:', e.message); }
for (const [zrodlo, url] of Object.entries(KANALY)) {
  try {
    for (const it of await pobierz(url)) {
      const tytul = pole(it, 'title');
      if (TEMAT.test(tytul)) nowe.push({ tytul, zrodlo, url: pole(it, 'link'), data: new Date(pole(it, 'pubDate')).toISOString() });
    }
  } catch (e) { console.error(zrodlo, e.message); }
}

const stare = existsSync(PLIK) ? JSON.parse(readFileSync(PLIK, 'utf8')).pozycje : [];
const mapa = new Map();
// Ten sam tekst w kilku miejscach = jedna pozycja; zostaje najstarsze wystąpienie (pierwsza publikacja).
for (const n of [...stare, ...nowe].filter((n) => n.tytul && n.url && !Number.isNaN(Date.parse(n.data)))) {
  const k = klucz(n.tytul);
  if (!mapa.has(k) || n.data < mapa.get(k).data) mapa.set(k, n);
}
const pozycje = [...mapa.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 80);
const zmiana = JSON.stringify(pozycje) !== JSON.stringify(stare);
if (zmiana || !existsSync(PLIK)) {
  writeFileSync(PLIK, JSON.stringify({ pobrano: new Date().toISOString(), pozycje }, null, 1) + '\n');
}
console.log(`${pozycje.length} nagłówków (${nowe.length} w tym przebiegu), ${zmiana ? 'zmiana' : 'bez zmian'}`);
