// Trzy osobne daty statusu: kiedy automat sprawdził Sejm, kiedy ostatnio coś się zmieniło w procesie,
// kiedy człowiek przejrzał dane. Data budowania strony nie mówi nic o świeżości informacji.
import projekt from '../data/pl/projekt-2848.json';
import monitor from '../../monitor/stan.json';

const strefa = { timeZone: 'Europe/Warsaw' } as const;
export const dzien = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', ...strefa });

export const status = {
  druk: projekt.druk,
  obowiazuje: projekt.uchwalony,
  etap: projekt.etap_krotko,
  // Zapisywane tylko przy udanym przebiegu: awaria API Sejmu zostawia poprzednią datę.
  sprawdzono: new Date(monitor.sprawdzono).toLocaleString('pl-PL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', ...strefa }),
  sprawdzonoIso: monitor.sprawdzono,
  zmiana: dzien(projekt.ostatnia_zmiana),
  przeglad: dzien(projekt.przeglad),
};
