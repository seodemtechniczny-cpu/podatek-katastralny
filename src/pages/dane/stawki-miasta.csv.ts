import { miasta } from '../../lib/gminy';
import { csv } from '../../lib/csv';
export function GET() {
  return csv(['miasto', 'teryt', 'wojewodztwo', 'budynki_mieszkalne_2026_zl_m2', 'grunty_pozostale_2026_zl_m2', 'budynki_dzialalnosc_2026_zl_m2', 'uchwala_2026', 'uchwala_2026_url', 'budynki_mieszkalne_2027_zl_m2', 'uchwala_2027', 'uchwala_2027_url', 'mediana_ceny_m2_2024_gus'],
    miasta.map((m) => [m.nazwa, m.teryt, m.wojewodztwo, m.stawki_2026.budynki_mieszkalne, m.stawki_2026.grunty_pozostale, m.stawki_2026.budynki_dzialalnosc, m.uchwala_2026.nr, m.uchwala_2026.url,
      m.stawki_2027?.budynki_mieszkalne ?? '', m.uchwala_2027?.nr ?? '', m.uchwala_2027?.url ?? '', m.cena_m2_mediana_2024]));
}
