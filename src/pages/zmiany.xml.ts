// Kanał Atom „zmiany w sprawie podatku katastralnego” z osi czasu.
import zdarzenia from '../data/pl/os-czasu.json';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function GET({ site }: { site: URL }) {
  const home = new URL('/', site).href;
  const lista = [...zdarzenia].sort((a, b) => b.data.localeCompare(a.data));
  const entries = lista.map((e) => `
  <entry>
    <title>${esc(e.tytul)}</title>
    <id>${home}#${e.data}-${encodeURIComponent(e.tytul.slice(0, 40))}</id>
    <updated>${e.data}T00:00:00Z</updated>
    <link href="${esc(e.zrodlo.url)}"/>
    <summary>${esc(`${e.kto}: ${e.opis} Źródło: ${e.zrodlo.nazwa}.`)}</summary>
  </entry>`).join('');
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="pl">
  <title>Podatek katastralny — zmiany w sprawie</title>
  <id>${home}</id>
  <link href="${home}"/>
  <link rel="self" href="${home}zmiany.xml"/>
  <updated>${lista[0].data}T00:00:00Z</updated>
  <author><name>podatek-katastralny.pl</name></author>${entries}
</feed>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } });
}
