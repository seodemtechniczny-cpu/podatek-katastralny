// CSV z danych serwisu w konwencji polskiego Excela: separator ;, przecinek dziesiętny, UTF-8 z BOM.
const pole = (v: unknown) => { const s = v === null || v === undefined ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const csv = (naglowki: string[], wiersze: unknown[][]) =>
  new Response('﻿' + [naglowki, ...wiersze].map((w) => w.map(pole).join(';')).join('\r\n') + '\r\n',
    { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
