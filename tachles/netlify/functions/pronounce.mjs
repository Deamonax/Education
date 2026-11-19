// POST /api/pronounce?ref=<reference text>  (body: audio/wav 16 kHz mono)
// -> {pron, accuracy, fluency, completeness, text, words:[{w, score, error, phonemes:[{p, score}]}]}
// Uses Azure Pronunciation Assessment (REST, short audio up to ~30 s).
import { env, json, guard } from "../lib/shared.mjs";
export const config = { path: "/api/pronounce" };

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const g = guard(req); if (g) return g;
  const key = env("AZURE_SPEECH_KEY"), region = env("AZURE_SPEECH_REGION");
  if (!key || !region) return json({ error: "no_key" }, 503);
  const ref = new URL(req.url).searchParams.get("ref") || "";
  if (!ref) return json({ error: "no_ref" }, 400);
  const cfg = { ReferenceText: ref.slice(0, 500), GradingSystem: "HundredMark", Granularity: "Phoneme", Dimension: "Comprehensive", EnableMiscue: true };
  const buf = await req.arrayBuffer();
  try {
    const r = await fetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000", "Accept": "application/json",
        "Pronunciation-Assessment": Buffer.from(JSON.stringify(cfg), "utf8").toString("base64") },
      body: buf
    });
    if (!r.ok) return json({ error: "upstream", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
    const d = await r.json();
    const best = (d.NBest || [])[0];
    if (!best) return json({ error: "no_speech", status: d.RecognitionStatus || "" }, 422);
    const pa = best.PronunciationAssessment || best;
    return json({
      text: best.Display || d.DisplayText || "",
      pron: pa.PronScore, accuracy: pa.AccuracyScore, fluency: pa.FluencyScore, completeness: pa.CompletenessScore,
      words: (best.Words || []).map(w => {
        const a = w.PronunciationAssessment || w;
        return { w: w.Word, score: a.AccuracyScore, error: a.ErrorType || "None",
          phonemes: (w.Phonemes || []).map(p => ({ p: p.Phoneme, score: (p.PronunciationAssessment || p).AccuracyScore })) };
      })
    });
  } catch (e) {
    return json({ error: "failed", detail: String(e.message || e).slice(0, 200) }, 502);
  }
};
