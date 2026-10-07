import projekt from '../../data/pl/projekt-2848.json';
import { csv } from '../../lib/csv';
export function GET() {
  return csv(['rodzaj', 'kwestia', 'tresc_albo_bylo', 'jest', 'przepis'], [
    ...projekt.parametry.map((p) => ['zasada', p.co, p.tresc, '', p.przepis]),
    ...projekt.zmiany.map((z) => [`zmiana ${z.z} → ${z.na}`, z.co, z.bylo, z.jest, z.przepis]),
  ]);
}
