// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://podatek-katastralny.pl',
  // Podgląd na github.io działa w podkatalogu repo: BASE=/podatek-katastralny/ przy buildzie podglądu.
  base: process.env.BASE || '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
