// GET/PUT /api/sync?code=XXXX-XXXX -> one learner's progress, so every device shows the same.
// Stored in Netlify Blobs. Protected by APP_PASSCODE when that is set. Never contains keys or the passcode.
import { getStore } from "@netlify/blobs";
import { json, guard } from "../lib/shared.mjs";
export const config = { path: "/api/sync" };
export default async (req) => {
  const bad = guard(req); if (bad) return bad;
  const code = (new URL(req.url).searchParams.get("code") || "").toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return json({ error: "code" }, 400);
  const store = getStore({ name: "progress", consistency: "strong" });
  if (req.method === "GET") { const rec = await store.get(code, { type: "json" }); return rec ? json(rec) : json({ missing: true }); }
  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > 3_000_000) return json({ error: "too big" }, 413);
    let b; try { b = JSON.parse(text); } catch { return json({ error: "json" }, 400); }
    if (!b || typeof b.at !== "number" || !b.data || typeof b.data !== "object") return json({ error: "shape" }, 400);
    if (b.data.settings) { delete b.data.settings.apiKey; delete b.data.settings.passcode; }
    const cur = await store.get(code, { type: "json" });
    if (cur && cur.at !== (b.base || 0) && cur.at >= (b.base || 0)) return json(cur, 409);
    await store.setJSON(code, { at: b.at, data: b.data });
    return json({ ok: true, at: b.at });
  }
  return json({ error: "method" }, 405);
};
