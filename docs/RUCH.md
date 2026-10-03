# Język ruchu

**Charakter: geodeta.** Spokojny, precyzyjny pomiar. Ruch wynika z mierzenia i wytyczania granic, nie z dekoracji.
Nic nie skacze, nie pulsuje, nie odbija się. Ruch ma pokazać, skąd jest liczba.

## Tokeny

| Token | Wartość | Użycie |
|---|---|---|
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | wszystko, co wchodzi |
| `--ease-io` | `cubic-bezier(0.65, 0, 0.35, 1)` | rysowanie linii |
| `--t-1` | 180 ms | hover, fokus |
| `--t-2` | 320 ms | panele, karty mapy |
| `--t-3` | 700 ms | rysowanie siatki, liczniki |
| przesunięcia | 8–14 px | wejścia treści |
| paralaksa | 4–12% wysokości sekcji | warstwy siatki |

## Wejście (hero = mapa Europy), ok. 4 s, każda interakcja przyspiesza ×5

1. **Pytanie jako ekran ładowania (0–1 s).** „Czy będzie podatek katastralny w Polsce?” stoi na środku ekranu,
   pod nim cienka linia pomiaru rośnie do pełnej szerokości tytułu. Nagłówek strony ukryty.
2. **Zjazd pod mapę (1–1,8 s).** Tytuł płynie (FLIP, sama translacja, te same łamania wierszy) na swoje miejsce
   w lewym dolnym rogu, nad Atlantykiem. Lead, przyciski i nagłówek strony wchodzą 8 px z dołu.
3. **Składanie mapy (1,2–3,4 s).** Państwa wjeżdżają 24 px od strony swojego regionu, od krawędzi do środka:
   zachód (od lewej) → wschód (od prawej) → północ (z góry) → południe (z dołu). Odstęp grup 420 ms, czas 620 ms.
4. **Polska wyrasta (3,3–4,1 s).** Pojawia się ostatnia, w swoim kolorze z danych. Górna warstwa unosi się o 7 jednostek,
   pod nią widać bok bryły (6 kopii konturu w ciemniejszym odcieniu). Wokół lekka biało-czerwona obwódka
   (biała 4, czerwona 10 jednostek, czerwień 30% krycia). Bez filtrów i cienia rozmywanego. Potem etykieta
   z linią odniesienia: „Polska · 1,03% PKB”.

Odstępstwo od 8–14 px: składanie mapy jest sygnaturą zamówioną wprost, 24 px to minimum czytelne jako „wjazd”.

## Sygnatury

1. **Siatka katastralna.** Pod mapą w hero leżą trzy warstwy podziału działek (SVG, cienkie linie). Przy przewijaniu przesuwają
   się z różną prędkością (CSS scroll-driven `animation-timeline: scroll()`), a linie granic rysują się raz przy wejściu
   (`stroke-dashoffset`). Działka „Twojego” lokalu wypełnia się delikatnie przy kalkulatorze.
2. **Linia pomiaru.** Liczby (stawki, % PKB) nie odliczają się od zera. Obok liczby przesuwa się kreska miary
   do jej długości, jak taśma geodety. Oś czasu ma pionową linię postępu, która rośnie wraz z przewijaniem.
3. **Etykieta mierniczego.** Karta państwa na mapie wychodzi od kursora z cienką linią odniesienia (jak opis działki
   na mapie ewidencyjnej). Państwo pod kursorem dostaje grubszy obrys, bez podnoszenia i bez cienia.

## Zakazy

- bez `filter: blur`, `backdrop-filter`, WebGL (Chrome bez GPU u części użytkowników tnie klatki)
- bez bounce, pulse, overshoot, obrotów, „parallax tilt”
- bez animowania layoutu (`width`, `top`) — tylko `transform`, `opacity`, `stroke-dashoffset`

## Ograniczony ruch

`prefers-reduced-motion: reduce` → brak paralaksy i rysowania; linie i liczby od razu w stanie końcowym,
przejścia kolorów zostają (180 ms). Przeglądarki bez `animation-timeline` dostają statyczne warstwy.
