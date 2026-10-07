import gminy from '../data/pl/gminy.json';
import obecny from '../data/pl/obecny-podatek.json';
import projekt from '../data/pl/projekt-2848.json';

export type Miasto = (typeof gminy.miasta)[keyof typeof gminy.miasta] & { slug: string };
export const miasta: Miasto[] = Object.entries(gminy.miasta).map(([slug, m]) => ({ slug, ...m }));
export const zrodla = gminy.zrodla;
export const max27 = obecny.stawki_maksymalne.find((s) => s.rok === 2027)!;
export const max26 = obecny.stawki_maksymalne.find((s) => s.rok === 2026)!;
export const prog = projekt.stawki_progresja;
export const zl = (n: number, d = 2) => n.toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d });
export const data = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
