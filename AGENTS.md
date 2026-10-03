# podatek-katastralny.pl

Bezstronny serwis o podatku katastralnym: stan sprawy w Polsce + porównanie Europy. Astro 7, statyczny, bez CMS.
Najpierw przeczytaj `docs/ARCHITEKTURA.md` (mapa serwisu, dane, neutralność) i `docs/RUCH.md` (język ruchu).

- Dane: `src/data/` — każdy fakt ma `zrodlo { nazwa, url, zweryfikowano }`. Bez źródła nie publikujemy.
- `npm run dane` (OECD 4100), `npm run mapa` (Natural Earth), `npm run monitor` (Sejm + ELI → `monitor/nowe.md`).
- OECD SDMX odpowiada 500 na domyślny `accept-language: *` z Node — nagłówek jest w skrypcie.
- Wdrożenie: push na main → GitHub Pages (workflow `deploy.yml`). Podgląd pod github.io ma `BASE` i noindex.
- Neutralność: bez słów wartościujących, wypowiedzi tylko jako cytat z przypisaniem, mapa w jednej skali barwy.
- Ruch: tylko transform/opacity/stroke-dashoffset, CSS scroll-driven, bez filtrów i maski na przesuwanych warstwach.
