// Monitoring sprawy w Polsce. Codziennie z GitHub Actions, ręcznie: node scripts/monitor.mjs
// 1) nowe etapy procesów śledzonych (druk 2848 i każdy dopisany do monitor/stan.json),
// 2) nowe projekty w Sejmie dotyczące podatku od nieruchomości (filtr po opisie, bo tytuł
//    „o podatkach i opłatach lokalnych” mają też projekty o opłacie turystycznej czy psach),
// 3) nowe obwieszczenia MF o górnych granicach stawek (Monitor Polski, ELI API).
// Wynik: monitor/stan.json (zapamiętany stan) i monitor/nowe.md (szkice wpisów do os-czasu.json,
// do neutralnej redakcji). Pusty nowe.md = brak zmian. Wpisy na stronę trafiają dopiero po przeglądzie.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SEJM = 'https://api.sejm.gov.pl/sejm/term10';
const ELI = 'https://api.sejm.gov.pl/eli';
// Projekt musi być podatkowy i dotyczyć podatku od nieruchomości albo wartości; „katastr” sam łapie „katastrofę”.
const PODATKOWY = /podat/i;
const TEMAT = /podat\w* od nieruchomo|katastraln|warto\w* (nieruchomo|lokal|budynk)|opodatkowani\w* (nieruchomo|lokal|budynk)/i;
const PLIK = 'monitor/stan.json';

// API Sejmu bywa chwilowo niedostępne (502/503, np. 06.10.2026): 4 próby z rosnącym odstępem.
const czekaj = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => {
  let blad;
  for (const przerwa of [0, 15000, 30000, 60000]) {
    await czekaj(przerwa);
    try {
      const r = await fetch(url, { headers: { 'accept-language': 'pl' } });
      if (r.ok) return r.json();
      blad = new Error(`${r.status} ${url}`);
      if (r.status < 500 && r.status !== 429) break; // błąd zapytania, ponawianie nic nie da
    } catch (e) { blad = e; }
  }
  throw blad;
};
const plaskie = (stages = []) => stages.flatMap((s) => [s, ...plaskie(s.children)]).filter((s) => s.date);
const klucz = (s) => `${s.date}|${s.stageName}`;

// Dłuższa awaria API = ostrzeżenie, nie błąd: stan zostaje nietknięty, więc następne udane uruchomienie
// wychwyci wszystko, co się zmieniło w międzyczasie (porównanie z zapisanym stanem, nie z wczoraj).
process.on('uncaughtException', (e) => {
  console.log(`::warning title=API Sejmu/ELI niedostępne::${e.message}. Stan bez zmian, ponowna próba przy następnym uruchomieniu.`);
  process.exit(0);
});

mkdirSync('monitor', { recursive: true });
// Pierwsze uruchomienie zapisuje stan bazowy bez zgłaszania (historia jest już w os-czasu.json).
const bazowy = !existsSync(PLIK);
const stan = bazowy ? { sledzone: { '2848': [] }, znane_projekty: [], obwieszczenia: [] } : JSON.parse(readFileSync(PLIK, 'utf8'));
const nowe = [];

// 1. Etapy śledzonych procesów
for (const [nr, znane] of Object.entries(stan.sledzone)) {
  const p = await get(`${SEJM}/processes/${nr}`);
  const etapy = plaskie(p.stages).map(klucz);
  for (const e of etapy.filter((e) => !znane.includes(e))) {
    const [data, nazwa] = e.split('|');
    nowe.push({ data, typ: 'etap', kto: 'Sejm', tytul: `Druk nr ${nr}: ${nazwa}`, url: `${SEJM}/processes/${nr}` });
  }
  if (p.passed) nowe.push({ data: p.changeDate.slice(0, 10), typ: 'etap', kto: 'Sejm', tytul: `Druk nr ${nr}: proces zakończony uchwaleniem`, url: `${SEJM}/processes/${nr}` });
  stan.sledzone[nr] = etapy;
}

// 2. Nowe projekty o podatku od nieruchomości
const kandydaci = new Map();
for (const q of ['podatkach i opłatach lokalnych', 'nieruchomości', 'katastr']) {
  for (const p of await get(`${SEJM}/processes?title=${encodeURIComponent(q)}&limit=100`)) kandydaci.set(p.number, p);
}
for (const p of kandydaci.values()) {
  if (stan.znane_projekty.includes(p.number)) continue;
  stan.znane_projekty.push(p.number);
  if (!PODATKOWY.test(p.title) || !TEMAT.test(`${p.title} ${p.description ?? ''}`) || p.number in stan.sledzone) continue;
  nowe.push({ data: p.processStartDate ?? p.documentDate, typ: 'projekt', kto: p.documentType ?? 'projekt',
    tytul: `Do sprawdzenia: ${p.title} (druk ${p.number})`, opis: p.description, url: `${SEJM}/processes/${p.number}` });
}

// 3. Obwieszczenia o górnych granicach stawek
for (const rok of [new Date().getFullYear() - 1, new Date().getFullYear()]) {
  const r = await get(`${ELI}/acts/search?publisher=MP&year=${rok}&title=${encodeURIComponent('górnych granic stawek kwotowych podatków i opłat lokalnych')}&limit=10`);
  for (const a of r.items ?? []) {
    if (stan.obwieszczenia.includes(a.ELI)) continue;
    stan.obwieszczenia.push(a.ELI);
    nowe.push({ data: a.promulgation ?? a.announcementDate, typ: 'stawki', kto: 'Minister finansów', tytul: a.title,
      url: `${ELI}/acts/${a.ELI}/text.pdf` });
  }
}

if (bazowy) nowe.length = 0;
stan.sprawdzono = new Date().toISOString();
writeFileSync(PLIK, JSON.stringify(stan, null, 1) + '\n');
const md = nowe.map((n) => `- **${n.data}** · ${n.typ} · ${n.kto}\n  ${n.tytul}${n.opis ? `\n  ${n.opis}` : ''}\n  ${n.url}`).join('\n');
writeFileSync('monitor/nowe.md', md ? `# Nowe zdarzenia do redakcji (${stan.sprawdzono.slice(0, 10)})\n\n${md}\n` : '');
console.log(bazowy ? 'Zapisano stan bazowy.' : nowe.length ? `Nowe: ${nowe.length}\n${md}` : 'Brak zmian.');
