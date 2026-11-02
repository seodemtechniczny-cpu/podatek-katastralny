// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import sitemap from '@astrojs/sitemap';

// Skrypt mapy w hero jest is:inline w <body> (kadr przed pierwszym malowaniem). Astro liczy hashe CSP tylko dla skryptów
// hoistowanych, a <meta> CSP nie obejmuje skryptów inline w <head> przed nim — więc hash hero liczymy sami z pliku źródłowego.
const heroSkrypt = readFileSync('src/components/HeroMapa.astro', 'utf8').split('<script is:inline>')[1].split('</script>')[0];
const heroHash = 'sha256-' + createHash('sha256').update(heroSkrypt).digest('base64');

// https://astro.build/config
export default defineConfig({
  site: 'https://podatek-katastralny.pl',
  // Podgląd na github.io działa w podkatalogu repo: BASE=/podatek-katastralny/ przy buildzie podglądu.
  base: process.env.BASE || '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
  // CSP przez <meta> (GitHub Pages nie ustawia nagłówków). Astro liczy hashe skryptów i stylów inline;
  // beacon Cloudflare ładuje się z static.cloudflareinsights.com i raportuje do cloudflareinsights.com.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "connect-src 'self' https://cloudflareinsights.com",
        "img-src 'self' data:",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: { resources: ["'self'", 'https://static.cloudflareinsights.com'], hashes: [heroHash] },
      // atrybuty style="" w szablonach (hero, kalkulator) — bez hashy, stąd unsafe-inline tylko dla atrybutów
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
