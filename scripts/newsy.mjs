// Najnowsze nagłówki mediów o podatku katastralnym → src/data/newsy.json (GitHub Actions co 3 godziny).
//
// Zasady (opis dla czytelników: strona /zrodla/):
// - pokazujemy tylko tytuł, nazwę redakcji, datę i link do oryginału: art. 99^7 ust. 3 pkt 2–3 ustawy o prawie
//   autorskim wyłącza z prawa wydawców prasy hiperłącza i „bardzo krótkie fragmenty” (Dz.U. 2024 poz. 1254),
// - przed każdym pobraniem sprawdzamy robots.txt i zastrzeżenie TDM (/.well-known/tdmrep.json, nagłówek
//   i meta „tdm-reservation”); zastrzeżenie albo zakaz = źródło pomijamy (art. 26^3 ust. 1–2),
// - przedstawiamy się w User-Agent z adresem strony z zasadami, odstęp między żądaniami 1,5 s,
// - Google News RSS NIE jest używany: robots.txt news.google.com blokuje /rss.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const CFG = JSON.parse(readFileSync('src/data/zrodla-newsow.json', 'utf8'));
const PLIK = 'src/data/newsy.json';
// Temat wąsko: kataster albo podatek od wartości (nie każdy tekst o podatku od nieruchomości).
const TEMAT = /katastr(?!of)|kataster|podat\w* od wartości|wartości (nieruchomości|mieszka|lokal)\w* .{0,30}podat|podat\w* od (mieszka|lokal)\w* .{0,40}(wartoś|lewic|2848|projekt)/i;
const NA_ZRODLO = 25; // maks. nowych artykułów sprawdzanych na źródło w jednym przebiegu
const czekaj = (ms) => new Promise((r) => setTimeout(r, ms));

const encje = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&#039;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/\s+/g, ' ').trim();
const klucz = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 80);

let ostatnie = 0;
async function pobierz(url) {
  await czekaj(Math.max(0, 1500 - (Date.now() - ostatnie)));
  ostatnie = Date.now();
  const r = await fetch(url, { headers: { 'user-agent': CFG.bot, 'accept-language': 'pl' }, redirect: 'follow' });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return { tekst: await r.text(), naglowki: r.headers };
}

// robots.txt: grupy dla naszego bota albo „*”, najdłuższe pasujące Allow/Disallow wygrywa.
const robotsCache = new Map();
async function wolno(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    let reguly = [];
    try {
      const r = await fetch(`${u.origin}/robots.txt`, { headers: { 'user-agent': CFG.bot } });
      if (r.ok) {
        const grupy = []; let g = null, poprzedniUA = false;
        for (const linia of (await r.text()).split(/\r?\n/)) {
          const [k, ...v] = linia.replace(/#.*/, '').split(':'); const key = k.trim().toLowerCase(), val = v.join(':').trim();
          if (key === 'user-agent') { if (!poprzedniUA) grupy.push(g = { ua: [], r: [] }); g.ua.push(val.toLowerCase()); poprzedniUA = true; continue; }
          poprzedniUA = false;
          if (g && (key === 'allow' || key === 'disallow')) g.r.push({ allow: key === 'allow', path: val });
        }
        const nasz = grupy.filter((x) => x.ua.some((a) => a !== '*' && 'podatekkatastralnybot'.includes(a)));
        reguly = (nasz.length ? nasz : grupy.filter((x) => x.ua.includes('*'))).flatMap((x) => x.r);
      }
    } catch { /* brak robots.txt = brak zakazów */ }
    // Zastrzeżenie TDM w formacie maszynowym (TDMRep).
    let tdm = false;
    try {
      const t = await fetch(`${u.origin}/.well-known/tdmrep.json`, { headers: { 'user-agent': CFG.bot } });
      if (t.ok) tdm = (await t.json()).some?.((x) => x['tdm-reservation'] === 1 && new RegExp('^' + (x.location ?? '/').replace(/\*/g, '.*')).test(u.pathname));
    } catch { /* brak pliku */ }
    robotsCache.set(u.origin, { reguly, tdm });
  }
  const { reguly, tdm } = robotsCache.get(u.origin);
  if (tdm) return false;
  const sciezka = u.pathname + u.search;
  let najlepsza = null;
  for (const r of reguly) {
    if (!r.path) continue;
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(sciezka) && (!najlepsza || r.path.length > najlepsza.path.length || (r.path.length === najlepsza.path.length && r.allow))) najlepsza = r;
  }
  return !najlepsza || najlepsza.allow;
}

const zastrzezone = (tekst, naglowki) => naglowki.get('tdm-reservation') === '1' || /<meta[^>]+name=["']tdm-reservation["'][^>]+content=["']1/i.test(tekst);
const meta = (t, ...nazwy) => {
  for (const n of nazwy) {
    const m = t.match(new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']+)`, 'i'))
      ?? t.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${n}["']`, 'i'));
    if (m) return encje(m[1]);
  }
  return '';
};
const dataZ = (t) => meta(t, 'article:published_time', 'og:article:published_time', 'datePublished', 'pubdate')
  || (t.match(/"datePublished"\s*:\s*"([^"]+)"/)?.[1]) || (t.match(/<time[^>]+datetime=["']([^"']+)/i)?.[1]) || '';

const stary = existsSync(PLIK) ? JSON.parse(readFileSync(PLIK, 'utf8')) : {};
// Pozycje z Google News (linki news.google.com) usuwamy: źródło nie spełnia zasad.
const pozycjeStare = (stary.pozycje ?? []).filter((p) => !p.url.includes('news.google.com'));
const sprawdzone = new Set(stary.sprawdzone ?? []);
const nowe = [], log = [];

// 1. Strony tagów redakcji → artykuły → tytuł i data z metadanych artykułu.
for (const z of CFG.tagi) {
  try {
    if (!(await wolno(z.url))) { log.push(`${z.nazwa}: robots/TDM zabrania, pomijam`); continue; }
    const { tekst, naglowki } = await pobierz(z.url);
    if (zastrzezone(tekst, naglowki)) { log.push(`${z.nazwa}: zastrzeżenie TDM, pomijam`); continue; }
    const host = new URL(z.url).hostname.replace(/^www\./, '');
    const linki = [...new Set([...tekst.matchAll(/<a\b[^>]*href="([^"#]+)"/g)].map((m) => { try { return new URL(encje(m[1]), z.url).href; } catch { return ''; } }))]
      .filter((h) => h && new URL(h).hostname.replace(/^www\./, '') === host && !/\/tag/.test(new URL(h).pathname) && new URL(h).pathname.length > 25 && !sprawdzone.has(h));
    let n = 0;
    for (const url of linki.slice(0, NA_ZRODLO)) {
      sprawdzone.add(url);
      if (!(await wolno(url))) continue;
      try {
        const a = await pobierz(url);
        if (zastrzezone(a.tekst, a.naglowki)) continue;
        const tytul = (meta(a.tekst, 'og:title') || encje(a.tekst.match(/<title>([^<]+)/i)?.[1] ?? ''))
          .replace(/\s+[-|–]\s+[^-|–]{2,40}$/, '');
        const opis = meta(a.tekst, 'og:description', 'description');
        const data = dataZ(a.tekst);
        if (!tytul || !TEMAT.test(`${tytul} ${opis}`) || Number.isNaN(Date.parse(data))) continue;
        nowe.push({ tytul, zrodlo: z.nazwa, url: meta(a.tekst, 'og:url') || url, data: new Date(data).toISOString() }); n++;
      } catch { /* pojedynczy artykuł niedostępny */ }
    }
    log.push(`${z.nazwa}: ${n} nowych`);
  } catch (e) { log.push(`${z.nazwa}: ${e.message}`); }
}

// 2. Kanały RSS redakcji, filtr po temacie w tytule.
for (const z of CFG.rss) {
  try {
    if (!(await wolno(z.url))) { log.push(`${z.nazwa} RSS: robots zabrania`); continue; }
    const { tekst } = await pobierz(z.url);
    let n = 0;
    for (const [, it] of tekst.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const pole = (tag) => encje(it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '');
      const tytul = pole('title'), data = pole('pubDate');
      if (TEMAT.test(tytul) && !Number.isNaN(Date.parse(data))) { nowe.push({ tytul, zrodlo: z.nazwa, url: pole('link'), data: new Date(data).toISOString() }); n++; }
    }
    log.push(`${z.nazwa} RSS: ${n}`);
  } catch (e) { log.push(`${z.nazwa} RSS: ${e.message}`); }
}

// Ten sam tekst w kilku miejscach = jedna pozycja (pierwsza publikacja).
const mapa = new Map();
for (const n of [...pozycjeStare, ...nowe]) {
  n.tytul = n.tytul.replace(/^<?!\[CDATA\[/, '').replace(/\]\]>?$/, '').trim();
  const k = klucz(n.tytul);
  if (!mapa.has(k) || n.data < mapa.get(k).data) mapa.set(k, n);
}
const pozycje = [...mapa.values()].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 80);
const zmiana = JSON.stringify(pozycje) !== JSON.stringify(stary.pozycje ?? []);
if (zmiana) writeFileSync(PLIK, JSON.stringify({ pobrano: new Date().toISOString(), pozycje, sprawdzone: [...sprawdzone].slice(-2000) }, null, 1) + '\n');
console.log(log.join('\n'));
console.log(`${pozycje.length} nagłówków, ${zmiana ? 'zmiana' : 'bez zmian'}`);
