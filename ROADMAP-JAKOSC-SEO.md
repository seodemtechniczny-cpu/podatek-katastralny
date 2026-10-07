# Checklista 50 punktów — podatek-katastralny.pl

Statusy: ✅ zrobione · 🟡 częściowo · ⏳ po akceptacji prototypu · 👤 czeka na Michała · — nie dotyczy (z powodem). Stan: 03.10.2026.

| # | Punkt | Status | Uwagi |
|---|---|---|---|
| 1 | Polityka prywatności | ⏳ 👤 | potrzebny administrator danych (Michał / DEM) |
| 2 | Regulamin | ⏳ | |
| 3 | Jasne CTA | ✅ | kalkulator, projekt, RSS |
| 4 | FAQ | ⏳ | z realnych pytań (Planner + „Podobne pytania”) |
| 5 | robots.txt | ✅ | |
| 6 | sitemap.xml | ✅ | @astrojs/sitemap |
| 7 | Własna 404 | ⏳ | |
| 8 | Alt text | ✅ | brak obrazów rastrowych; SVG dekoracyjne `aria-hidden`, mapa z `aria-label` per państwo |
| 9 | Analityka | ⏳ 👤 | GA4 + Consent Mode v2, nowa usługa |
| 10 | Meta title | ✅ | strona główna |
| 11 | Meta description | ✅ | strona główna |
| 12 | Open Graph | ✅ | tagi + og.png 1200×630 (scripts/og.mjs) |
| 13 | Favicon | ✅ | SVG + ICO |
| 14 | Canonical | ✅ | na domenę docelową |
| 15 | Cookie consent | ⏳ | baner dopiero z GA4; dziś zero obcych hostów (zmierzone) |
| 16 | Responsywność | ✅ | 1440 i 390, zero przewijania poziomego |
| 17 | Dostępność | 🟡 | mapa z klawiatury + tabela, skip link; pełny audyt Lighthouse po podstronach |
| 18 | Test formularzy | 🟡 | kalkulator sprawdzony (3 lokale = 2617 zł) |
| 19 | Broken links | ⏳ | skrypt sprawdzający źródła w CI |
| 20 | Szybkość | 🟡 | 0 JS frameworka, fonty lokalne; pomiar po wdrożeniu |
| 21 | Google Search Console | ✅ | domena zweryfikowana, konto usługi z pełnym dostępem, sitemap wysłana |
| 22 | index / noindex | ✅ | podgląd github.io = noindex; produkcja = index |
| 23 | Statusy HTTP | ⏳ | po DNS |
| 24 | Przekierowania 301 | — | domena bez historii (archiwum: tylko strona główna 2025) |
| 25 | H1–H3 | ✅ | jeden H1, H2 per sekcja |
| 26 | Search intent | 🟡 | H1 jako pytanie; Planner przy podstronach |
| 27 | Unikalne treści | ⏳ | strony państw pisane osobno |
| 28 | Linkowanie wewnętrzne | ⏳ | |
| 29 | Orphan pages | ⏳ | |
| 30 | Struktura URL | ✅ | plan w docs/ARCHITEKTURA.md |
| 31 | Schema.org | ⏳ | WebSite, Organization, BreadcrumbList, FAQPage, Dataset |
| 32 | Breadcrumbs | ⏳ | podstrony |
| 33 | Duplicate content | ✅ | canonical, jeden host |
| 34 | HTTPS | 👤 | po DNS „Enforce HTTPS” |
| 35 | Core Web Vitals | ⏳ | pomiar po wdrożeniu |
| 36 | WebP/AVIF | — | brak zdjęć; og:image jako PNG/WebP |
| 37 | Lazy loading | — | brak obrazów rastrowych |
| 38 | Renderowanie JS | ✅ | treść w HTML (statyczny build) |
| 39 | hreflang | — | tylko PL |
| 40 | Local SEO | — | nie jest biznesem lokalnym |
| 41 | Google Business Profile | — | jw. |
| 42 | NAP | — | jw. |
| 43 | Dane autora / kontakt | ⏳ 👤 | strona „O serwisie” |
| 44 | E-E-A-T | 🟡 | źródło + data przy każdym fakcie; metodologia, polityka korekt ⏳ |
| 45 | Mobile | ✅ | zrzuty 390 |
| 46 | Przeglądarki | ⏳ | Chrome ✅; WebKit, Firefox przy pełnej wersji |
| 47 | Test szybkości po publikacji | ⏳ | |
| 48 | Indeksacja po wdrożeniu | ⏳ 👤 | Google ma jeszcze stronę GoDaddy z 03.10; prośba o zindeksowanie w GSC |
| 49 | Monitoring GSC | ⏳ 👤 | |
| 50 | Linki i przekierowania po publikacji | ⏳ | |
