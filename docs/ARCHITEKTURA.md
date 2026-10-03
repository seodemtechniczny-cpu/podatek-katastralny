# podatek-katastralny.pl — architektura

Bezstronny serwis informacyjny. Rdzeń: stan sprawy w Polsce do uchwalenia albo upadku projektu.
Drugi filar: jak podatek od nieruchomości działa w państwach Europy.

## Mapa serwisu (URL → intencja)

| URL | H1 | Intencja wyszukiwania |
|---|---|---|
| `/` | Czy będzie podatek katastralny w Polsce? (hero = mapa Europy, wejście opisane w RUCH.md) | „podatek katastralny”, „czy będzie podatek katastralny” |
| `/projekt-ustawy/` | Co zakłada projekt podatku katastralnego (druk 2848) | „projekt podatku katastralnego”, „stawki” |
| `/kalkulator/` | Kalkulator: ile wyniósłby podatek według projektu | „ile zapłacę podatku katastralnego” |
| `/os-czasu/` | Podatek katastralny — oś czasu | „podatek katastralny kiedy” |
| `/obecny-podatek/` | Podatek od nieruchomości dziś: stawki i zasady | „stawki podatku od nieruchomości 2027” |
| `/argumenty/` | Argumenty zwolenników i przeciwników | „podatek katastralny za i przeciw” |
| `/europa/` | Podatek od nieruchomości w Europie — mapa | „podatek katastralny w Europie” |
| `/europa/{kraj}/` | Podatek od nieruchomości w {kraju} | „podatek katastralny Niemcy” itd. |
| `/faq/` | Pytania i odpowiedzi | pytania z „Podobne pytania” |
| `/metodologia/` | Skąd są dane i jak je porównujemy | wiarygodność |
| `/o-serwisie/` | O serwisie, autor, polityka korekt | E-E-A-T |
| `/polityka-prywatnosci/`, `/regulamin/`, `/404` | — | prawne |
| `/zmiany.xml` | kanał Atom z osi czasu | subskrypcja bez backendu |

Ścieżki płaskie, polskie słowa, bez dat w adresie. Kraje: polska nazwa bez znaków diakrytycznych (`/europa/niemcy/`).

## Dane (src/data)

Jedno źródło prawdy, strony tylko renderują. Każdy fakt niesie `zrodlo { nazwa, url, zweryfikowano }`.

- `pl/projekt-2848.json` — parametry projektu z autopoprawką, z przepisem przy każdym punkcie.
- `pl/os-czasu.json` — zdarzenia: `data`, `typ` (projekt | etap | wypowiedz | rekomendacja | stawki), `kto`, `tytul`, `opis`, `zrodlo`.
- `pl/obecny-podatek.json` — stawki maksymalne z Monitora Polskiego, rok po roku.
- `stats.json` — generowany (`npm run dane`) z OECD Global Revenue Statistics, kategoria 4100: % PKB i % wszystkich podatków, najnowszy rok.
- `europe-map.json` — generowany (`npm run mapa`) z Natural Earth 1:50m, odwzorowanie LAEA.
- `kraje/{iso}.json` — opis systemu per państwo: `podstawa` (wartosc_rynkowa | katastralna | powierzchnia | mieszana | brak), `kto_ustala_stawki`, `stawka_opis`, `wycena_co_ile`, `ostatnia_reforma { rok, opis, zrodlo }`, `skutki [ { opis, zrodlo } ]`. Pole puste = „brak danych”, nigdy szacunek.

### Dlaczego % PKB, a nie stawka

Stawek nie da się porównać wprost: podstawą bywa wartość rynkowa, wartość katastralna sprzed dekad albo powierzchnia,
a stawki ustalają gminy. % PKB z OECD liczy wszystkie kraje tą samą metodą. Eurostat (D29A + D59A) wlicza podatek
od majątku netto (Szwajcaria, Luksemburg, Norwegia), dlatego nie jest głównym miernikiem.

## Monitoring Polski

`scripts/monitor.mjs` codziennie w GitHub Actions:
1. Sejm API `processes/2848` — nowe etapy.
2. Sejm API `processes?title=…&modifiedSince=` — nowe projekty o podatkach lokalnych / wartości nieruchomości.
3. ELI API `acts/MP/{rok}` — nowe obwieszczenia o górnych granicach stawek.
Zmiana → PR z szkicem wpisu do `os-czasu.json` (opis do neutralnej redakcji). Nic nie idzie na produkcję bez przeglądu.

## Zasady neutralności

- Fakty z datą i źródłem. Wypowiedzi tylko jako cytat z przypisaniem.
- Nagłówki jako pytania lub fakty, bez tez.
- Bez słów wartościujących („haracz”, „sprawiedliwy”, „uderzy w”).
- Argumenty za i przeciw w tej samej liczbie, w tym samym układzie, każdy przypisany do podmiotu.
- Kolory mapy w jednej skali grafitu (dane). Czerwień flagi tylko jako akcent serwisu i dla Polski, nie jako ocena.
