import zdarzenia from '../../data/pl/os-czasu.json';
import { csv } from '../../lib/csv';
export function GET() {
  return csv(['data', 'typ', 'kto', 'tytul', 'opis', 'zrodlo', 'zrodlo_url'],
    zdarzenia.map((e) => [e.data, e.typ, e.kto, e.tytul, e.opis, e.zrodlo.nazwa, e.zrodlo.url]));
}
