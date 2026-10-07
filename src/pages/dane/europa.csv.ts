import { panstwa, dane, PODSTAWA } from '../../lib/europa';
import rw from '../../data/rok-wyceny.json';
import { csv } from '../../lib/csv';
export function GET() {
  const r = rw.kraje as Record<string, { rok_wyceny: unknown }>;
  return csv(['iso3', 'panstwo', 'podstawa_podatku', 'wplywy_proc_pkb', 'wplywy_proc_podatkow', 'rok_danych_oecd', 'rok_wartosci_w_podatku', 'zrodlo_podstawy'],
    panstwa.map((c) => [c.iso, dane[c.iso].n, PODSTAWA[c.iso]?.podstawa ?? '', dane[c.iso].g ?? '', dane[c.iso].t ?? '', dane[c.iso].y ?? '', r[c.iso]?.rok_wyceny ?? '', PODSTAWA[c.iso]?.url ?? '']));
}
