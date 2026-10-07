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
const PROJEKT = 'src/data/pl/projekt-2848.json', OS = 'src/data/pl/os-czasu.json';

// Szablony etapów (nazwy jak w API Sejmu). krok = indeks bieżącego kroku na osi „Stan sprawy”
// (0 wpłynięcie, 1 I czytanie, 2 komisja, 3 II i III czytanie, 4 Senat, 5 Prezydent, 6 Dziennik Ustaw).
// Terminy: Senat 30 dni (art. 121 Konstytucji), Prezydent 21 dni, weto odrzuca Sejm większością 3/5 (art. 122).
const ETAPY = {
  'Skierowano do I czytania na posiedzeniu Sejmu': { krok: 1, krotko: 'czeka na I czytanie', etap: 'Skierowany do I czytania na posiedzeniu Sejmu',
    dalej: 'Pierwsze czytanie na posiedzeniu Sejmu. Termin wyznacza Marszałek Sejmu.' },
  'Skierowano do I czytania w komisjach': { krok: 1, krotko: 'czeka na I czytanie w komisji', etap: 'Skierowany do I czytania w komisji',
    dalej: 'Pierwsze czytanie w komisji sejmowej.' },
  'I czytanie na posiedzeniu Sejmu': { krok: 2, krotko: 'po I czytaniu', etap: 'Po I czytaniu na posiedzeniu Sejmu',
    dalej: 'Jeśli Sejm nie odrzucił projektu, pracuje nad nim komisja, która przygotuje sprawozdanie.',
    sprawdz: 'Wynik głosowania nad ewentualnym wnioskiem o odrzucenie projektu. Odrzucenie kończy proces.' },
  'I czytanie w komisjach': { krok: 2, krotko: 'po I czytaniu w komisji', etap: 'Po I czytaniu w komisji',
    dalej: 'Dalsza praca komisji i sprawozdanie dla Sejmu.' },
  'Praca w komisjach po I czytaniu': { krok: 2, krotko: 'w komisji', etap: 'Praca w komisji po I czytaniu',
    dalej: 'Sprawozdanie komisji, potem II czytanie na posiedzeniu Sejmu.' },
  'Sprawozdanie komisji': { krok: 3, krotko: 'po sprawozdaniu komisji', etap: 'Komisja przedstawiła sprawozdanie',
    dalej: 'II czytanie na posiedzeniu Sejmu.',
    sprawdz: 'Sprawozdanie może zmieniać tekst projektu. Porównaj je z poprzednią wersją: dopisz wersję do „wersje”, każdą różnicę do „zmiany” (co, było, jest, przepis) i zaktualizuj „parametry” w projekt-2848.json. Strona /projekt-ustawy/ pokaże BYŁO → JEST sama.' },
  'II czytanie na posiedzeniu Sejmu': { krok: 3, krotko: 'po II czytaniu', etap: 'Po II czytaniu na posiedzeniu Sejmu',
    dalej: 'III czytanie, czyli głosowanie nad całym projektem.', sprawdz: 'Czy zgłoszono poprawki zmieniające parametry.' },
  'Praca w komisjach po II czytaniu': { krok: 3, krotko: 'w komisji po II czytaniu', etap: 'Komisja rozpatruje poprawki z II czytania',
    dalej: 'III czytanie, czyli głosowanie nad całym projektem.' },
  'III czytanie na posiedzeniu Sejmu': { krok: 4, krotko: 'po głosowaniu w Sejmie', etap: 'Sejm głosował w III czytaniu',
    dalej: 'Jeśli Sejm uchwalił ustawę, trafia ona do Senatu, który ma 30 dni na stanowisko.',
    sprawdz: 'Wynik głosowania: uchwalona czy odrzucona. Przy uchwaleniu zmień etap_krotko na „uchwalona przez Sejm, w Senacie”.' },
  'Stanowisko Senatu': { krok: 4, krotko: 'po stanowisku Senatu', etap: 'Senat zajął stanowisko',
    dalej: 'Poprawki albo odrzucenie przez Senat: Sejm głosuje nad stanowiskiem Senatu. Bez poprawek ustawa trafia do Prezydenta.',
    sprawdz: 'Treść stanowiska: bez poprawek, z poprawkami czy wniosek o odrzucenie.' },
  'Ustawę przekazano Prezydentowi do podpisu': { krok: 5, krotko: 'u Prezydenta', etap: 'Ustawa przekazana Prezydentowi do podpisu',
    dalej: 'Prezydent ma 21 dni: podpis, odmowa podpisu (weto) albo wniosek do Trybunału Konstytucyjnego.' },
  'Prezydent podpisał ustawę': { krok: 6, krotko: 'podpisana, czeka na publikację', etap: 'Prezydent podpisał ustawę',
    dalej: 'Publikacja w Dzienniku Ustaw. Podatek obowiązuje dopiero od dnia wejścia ustawy w życie.' },
  'Wniosek Prezydenta (weto)': { krok: 5, krotko: 'zawetowana', etap: 'Prezydent odmówił podpisania ustawy (weto)',
    dalej: 'Sejm może odrzucić weto większością 3/5 głosów. Bez tego ustawa nie wchodzi w życie.' },
};
const pl = (iso) => iso.split('-').reverse().join('.');

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

// 4. Uchwały rad 20 miast o stawkach na kolejny rok (dzienniki wojewódzkie, ELI). Dwa razy w tygodniu:
//    lista aktów województwa to kilka MB, nie pobieramy jej codziennie. Stawkę z uchwały przepisuje redakcja.
const gminy = JSON.parse(readFileSync('src/data/pl/gminy.json', 'utf8'));
if ([1, 4].includes(new Date().getDay()) || process.argv.includes('--uchwaly')) {
  stan.uchwaly ??= [];
  const rok = +(process.argv.find((a) => a.startsWith("--rok="))?.slice(6) ?? new Date().getFullYear());
  const dzienniki = new Map();
  for (const m of Object.values(gminy.miasta)) {
    const [, host, kod] = m.uchwala_2026.url.match(/^(https:\/\/[^/]+)\/(WDU_\w)\//);
    dzienniki.set(`${host}|${kod}`, [...(dzienniki.get(`${host}|${kod}`) ?? []), m]);
  }
  for (const [klucz, lista] of dzienniki) {
    const [host, kod] = klucz.split('|');
    let akty;
    // Część dzienników zwraca klucze wielką literą (Items, Title, Pos): ujednolicamy.
    const male = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k[0].toLowerCase() + k.slice(1), v]));
    try { const j = await get(`${host}/api/eli/acts/${kod}/${rok}`); akty = (j.items ?? j.Items ?? []).map(male); }
    catch (e) { console.log(`::warning title=Dziennik ${kod} niedostępny::${e.message}`); continue; }
    for (const a of akty) {
      if (stan.uchwaly.includes(a.eli) || !/^Uchwała/.test(a.title) || /Kolegium|Izby/.test(a.title) || !/stawek\s+(w\s+)?podatku\s+od\s+nieruchomo/i.test(a.title)) continue;
      const m = lista.find((x) => new RegExp(`Rady (Miasta (Stołecznego )?|Miejskiej (we? )?|m\\. ?st\\. ?)(${x.rdzen})`, "i").test(a.title));
      if (!m) continue;
      stan.uchwaly.push(a.eli);
      nowe.push({ data: (a.promulgation ?? '').slice(0, 10), typ: 'uchwała', kto: m.nazwa, tytul: a.title,
        opis: `Sprawdź, czy dotyczy ${rok + 1} r., i przepisz stawkę dla budynków mieszkalnych do src/data/pl/gminy.json (${Object.keys(gminy.miasta).find((k) => gminy.miasta[k] === m)}: stawki_${rok + 1}, uchwala_${rok + 1}).`,
        url: `${host}/${kod}/${rok}/${a.pos}/akt.pdf` });
    }
  }
}

if (bazowy) nowe.length = 0;
stan.sprawdzono = new Date().toISOString();
writeFileSync(PLIK, JSON.stringify(stan, null, 1) + '\n');
const dzis = stan.sprawdzono.slice(0, 10);

// Nowy etap druku 2848 ze szablonem: PR od razu zawiera zmiany w danych, zatwierdzenie = scalenie PR.
const etapy2848 = nowe.filter((n) => n.typ === 'etap' && n.tytul.startsWith('Druk nr 2848: ') && ETAPY[n.tytul.slice(14)])
  .sort((a, b) => a.data.localeCompare(b.data));
let tytulPR = 'Monitoring: nowe zdarzenia do sprawdzenia';
const sekcje = [];
if (etapy2848.length) {
  const projekt = JSON.parse(readFileSync(PROJEKT, 'utf8'));
  const os = JSON.parse(readFileSync(OS, 'utf8'));
  for (const n of etapy2848) {
    const e = ETAPY[n.tytul.slice(14)];
    const zrodlo = { nazwa: 'Sejm RP, proces 2848', url: n.url, zweryfikowano: dzis };
    os.push({ data: n.data, typ: 'etap', kto: 'Sejm', tytul: e.etap, opis: `Co dalej: ${e.dalej}`, zrodlo });
    sekcje.push(`## ${e.etap} (${pl(n.data)})\n\n` +
      `**Co się stało:** ${e.etap}, ${pl(n.data)}. Źródło: ${n.url}\n\n` +
      `**Co się NIE zmieniło:** podatek katastralny nie obowiązuje; stawki i zasady z projektu bez zmian, chyba że niżej zaznaczono inaczej.\n\n` +
      `**Co dalej:** ${e.dalej}\n` + (e.sprawdz ? `\n**Sprawdź przed scaleniem:** ${e.sprawdz}\n` : ''));
  }
  const ost = etapy2848.at(-1), e = ETAPY[ost.tytul.slice(14)];
  Object.assign(projekt, { etap: `${e.etap} (${pl(ost.data)})`, etap_krotko: e.krotko, krok_procedury: e.krok, ostatnia_zmiana: ost.data, przeglad: dzis });
  projekt.zrodla[0].zweryfikowano = dzis;
  os.sort((a, b) => a.data.localeCompare(b.data));
  writeFileSync(PROJEKT, JSON.stringify(projekt, null, 2) + '\n');
  writeFileSync(OS, JSON.stringify(os, null, 2) + '\n');
  tytulPR = `Druk 2848: ${e.etap} (${pl(ost.data)})`;
}

const md = nowe.map((n) => `- **${n.data}** · ${n.typ} · ${n.kto}\n  ${n.tytul}${n.opis ? `\n  ${n.opis}` : ''}\n  ${n.url}`).join('\n');
writeFileSync('monitor/nowe.md', md ? `# ${tytulPR}\n\n` +
  (sekcje.length ? `Ten PR zmienia stan sprawy i oś czasu na stronie. Scalenie = publikacja.\n\n${sekcje.join('\n')}\n## Wszystkie wykryte zdarzenia\n\n` : '') +
  `${md}\n` : '');
console.log(bazowy ? 'Zapisano stan bazowy.' : nowe.length ? `Nowe: ${nowe.length}\n${md}` : 'Brak zmian.');
