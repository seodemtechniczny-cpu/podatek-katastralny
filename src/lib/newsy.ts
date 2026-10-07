// Nagłówki na stronie: ze stron tagów od razu, z ogólnych RSS dopiero po akceptacji
// (adres w którymś z plików monitor/newsy/*.txt scalonych do main).
import newsy from '../data/newsy.json';

const pliki = import.meta.glob('../../monitor/newsy/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const zaakceptowane = new Set(Object.values(pliki).flatMap((t) => t.split('\n').map((l) => l.split(/\s/)[0]).filter(Boolean)));

export const pobrano = newsy.pobrano;
export const pozycje = newsy.pozycje.filter((p: { url: string; akceptacja?: boolean }) => !p.akceptacja || zaakceptowane.has(p.url));
