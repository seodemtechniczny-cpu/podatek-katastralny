// Radar druków: dzieli tekst projektu na artykuły i porównuje je z poprzednią wersją. Tylko wewnętrzny detektor
// do PR-a z monitoringu: wskazuje artykuły do sprawdzenia, niczego nie publikuje. Tekst z PDF przez pdftotext.
// Test: node scripts/radar.mjs stary.txt nowy.txt
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const norm = (t) => t.replace(/[–-] ?\d+ ?[–-]/g, ' ').replace(/-\n\s*/g, '').replace(/[„”"«»]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

// Artykuł = od „Art. 5a.” do następnego. Ten sam numer występujący później (np. w autopoprawce) nadpisuje wcześniejszy.
export function artykuly(tekst) {
  const mapa = new Map();
  // Uzasadnienie i OSR nie są tekstem prawnym: ucinamy je, żeby nie doklejały się do ostatniego artykułu.
  const czesci = tekst.split(/\n\s*UZASADNIENIE\s*\n/i)[0].split(/(?=(?:^|\n)\s*[„"]?Art\. \d+[a-z]*\.)/);
  for (const c of czesci) {
    const m = c.match(/Art\. (\d+[a-z]*)\./);
    if (m) mapa.set(m[1], norm(c));
  }
  return mapa;
}

export function porownaj(stary, nowy) {
  const a = artykuly(stary), b = artykuly(nowy);
  return {
    zmienione: [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k)),
    nowe: [...b.keys()].filter((k) => !a.has(k)),
    usuniete: [...a.keys()].filter((k) => !b.has(k)),
  };
}

export async function tekstPdf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return execFileSync('pdftotext', ['-layout', '-', '-'], { input: Buffer.from(await r.arrayBuffer()) }).toString();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(porownaj(readFileSync(process.argv[2], 'utf8'), readFileSync(process.argv[3], 'utf8')));
}
