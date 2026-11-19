// POST /api/transcribe  (body: audio/wav)  ->  {text, duration, segments:[{start,end,text}]}
// Verbatim speech-to-text with OpenAI Whisper, so her real errors stay visible.
import { env, json, guard } from "../lib/shared.mjs";
export const config = { path: "/api/transcribe" };

// A disfluent prompt nudges Whisper to write what was said, not a cleaned-up version.
const VERBATIM = "Um, so, uh, I think we, like, need to check the the numbers. Okay, so I'm responsible on the payouts and, uh, KYC.";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const g = guard(req); if (g) return g;
  const key = env("OPENAI_API_KEY");
  if (!key) return json({ error: "no_key" }, 503);
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return json({ error: "empty" }, 400);
  if (buf.byteLength > 24 * 1024 * 1024) return json({ error: "too_big" }, 413);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "audio/wav" }), "speech.wav");
  form.append("model", env("WHISPER_MODEL") || "whisper-1");
  form.append("language", "en");
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("prompt", VERBATIM);
  try {
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { authorization: "Bearer " + key }, body: form });
    if (!r.ok) return json({ error: "upstream", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
    const d = await r.json();
    return json({ text: (d.text || "").trim(), duration: d.duration || null,
      segments: (d.segments || []).map(s => ({ start: s.start, end: s.end, text: s.text })) });
  } catch (e) {
    return json({ error: "failed", detail: String(e.message || e).slice(0, 200) }, 502);
  }
};
