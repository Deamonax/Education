/* Bewaart de voortgang van één speler onder een code. Netlify Function + Netlify Blobs. */
import { getStore } from '@netlify/blobs';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req) => {
  const code = (new URL(req.url).searchParams.get('code') || '').toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json({ error: 'code' }, 400);
  const store = getStore({ name: 'voortgang', consistency: 'strong' });
  if (req.method === 'GET') {
    const rec = await store.get(code, { type: 'json' });
    return rec ? json(rec) : json({ error: 'onbekend' }, 404);
  }
  if (req.method === 'PUT') {
    const text = await req.text();
    if (text.length > 1_500_000) return json({ error: 'te groot' }, 413);
    let b; try { b = JSON.parse(text); } catch { return json({ error: 'json' }, 400); }
    if (!b || typeof b.at !== 'number' || !b.data || typeof b.data !== 'object') return json({ error: 'vorm' }, 400);
    const cur = await store.get(code, { type: 'json' });
    /* iemand anders heeft sinds onze laatste keer iets bewaard: niet overschrijven, terugsturen */
    if (cur && cur.at !== (b.base || 0) && cur.at >= (b.base || 0)) return json(cur, 409);
    await store.setJSON(code, { at: b.at, data: b.data });
    return json({ ok: true, at: b.at });
  }
  return json({ error: 'methode' }, 405);
};

export const config = { path: '/api/sync' };
