// node tools/tests/functions.test.mjs  (mocks upstream APIs)
import assert from "assert";
import claude from "../../netlify/functions/claude.mjs";
import status from "../../netlify/functions/status.mjs";
import transcribe from "../../netlify/functions/transcribe.mjs";
import pronounce from "../../netlify/functions/pronounce.mjs";
import { extractJson, cleanIssues } from "../../netlify/lib/shared.mjs";

let fails = 0;
async function t(name, fn) { try { await fn(); } catch (e) { fails++; console.log("FAIL", name, e.message); } }
const post = (url, body, headers = {}) => new Request("http://x" + url, { method: "POST", body: typeof body === "string" || body instanceof ArrayBuffer ? body : JSON.stringify(body), headers });
let last;
function mockFetch(reply, statusCode = 200) {
  globalThis.fetch = async (url, opts) => { last = { url, opts }; return new Response(typeof reply === "string" ? reply : JSON.stringify(reply), { status: statusCode }); };
}
const env = process.env;

await t("extractJson with noise", () => {
  assert.deepStrictEqual(extractJson('Sure! {"a":{"b":"x}y"}} trailing'), { a: { b: "x}y" } });
});
await t("cleanIssues", () => {
  const c = cleanIssues([{ original: "on", fix: "for", cat: "prep" }, { original: "x", fix: "x" }, { original: "a", fix: "b", cat: "weird" }]);
  assert.strictEqual(c.length, 2); assert.strictEqual(c[1].cat, "other");
});

delete env.ANTHROPIC_API_KEY;
await t("no key -> 503", async () => { const r = await claude(post("/api/claude", { task: "check", text: "hi" })); assert.strictEqual(r.status, 503); });

env.GROQ_API_KEY = "g";
await t("free Groq fallback", async () => {
  mockFetch({ choices: [{ message: { content: '{"issues":[{"original":"until Friday","fix":"by Friday","cat":"prep","en":"e","he":"h","severity":3}],"natural":"By Friday.","tone":{"direct":false}}' } }] });
  const r = await claude(post("/api/claude", { task: "check", text: "until Friday", kind: "mail" }));
  assert.strictEqual(r.status, 200); const d = await r.json(); assert.strictEqual(d.issues[0].fix, "by Friday");
  assert(last.url.includes("api.groq.com")); const sent = JSON.parse(last.opts.body);
  assert.strictEqual(sent.messages[0].role, "system"); assert.strictEqual(sent.messages[1].content, "until Friday"); assert.strictEqual(last.opts.headers.authorization, "Bearer g");
  const s = await (await status(new Request("http://x/api/status"))).json(); assert.strictEqual(s.provider, "groq"); assert.strictEqual(s.whisper, !!env.OPENAI_API_KEY || true);
});
await t("free Groq: transcribe", async () => {
  const had = env.OPENAI_API_KEY; delete env.OPENAI_API_KEY;
  mockFetch({ text: " I am responsible on it. ", duration: 2, segments: [] });
  const r = await transcribe(post("/api/transcribe", new ArrayBuffer(8), { "content-type": "audio/wav" }));
  assert.strictEqual(r.status, 200); assert(last.url.includes("api.groq.com")); assert.strictEqual(last.opts.body.get("model"), "whisper-large-v3");
  if (had) env.OPENAI_API_KEY = had;
});
await t("free Groq: rate limit message", async () => {
  mockFetch({ error: "rate" }, 429); const r = await claude(post("/api/claude", { task: "check", text: "x" })); assert.strictEqual(r.status, 429);
});
delete env.GROQ_API_KEY;
env.ANTHROPIC_API_KEY = "k";
await t("check task", async () => {
  mockFetch({ content: [{ type: "text", text: 'Here: {"issues":[{"original":"responsible on","fix":"responsible for","cat":"prep","en":"e","he":"h","severity":3}],"natural":"I am responsible for it.","tone":{"direct":false}}' }] });
  const r = await claude(post("/api/claude", { task: "check", text: "I am responsible on it.", kind: "mail" }));
  assert.strictEqual(r.status, 200);
  const d = await r.json();
  assert.strictEqual(d.issues[0].fix, "responsible for");
  const sent = JSON.parse(last.opts.body);
  assert(sent.system.includes("AMERICAN"));
  assert.strictEqual(sent.messages[0].content, "I am responsible on it.");
  assert.strictEqual(last.opts.headers["x-api-key"], "k");
});
await t("roleplay history maps roles and starts with user", async () => {
  mockFetch({ content: [{ type: "text", text: '{"reply":"Sure, go ahead.","done":false}' }] });
  const r = await claude(post("/api/claude", { task: "roleplay", scenario: { title: "T" }, history: [{ role: "partner", text: "Hi" }, { role: "me", text: "Hello" }] }));
  const d = await r.json(); assert.strictEqual(d.reply, "Sure, go ahead.");
  const sent = JSON.parse(last.opts.body);
  assert.deepStrictEqual(sent.messages.map(m => m.role), ["user", "assistant", "user"]);
  assert.strictEqual(sent.model, "claude-haiku-5-5");
});
await t("debrief caps fixes at 3", async () => {
  const f = Array.from({ length: 6 }, (_, i) => ({ original: "a" + i, fix: "b" + i, cat: "prep" }));
  mockFetch({ content: [{ type: "text", text: JSON.stringify({ fixes: f, good: [], errors: 6 }) }] });
  const d = await (await claude(post("/api/claude", { task: "debrief", history: [{ role: "me", text: "x" }] }))).json();
  assert.strictEqual(d.fixes.length, 3);
});
await t("upstream error -> 502", async () => {
  mockFetch("overloaded", 529);
  const r = await claude(post("/api/claude", { task: "check", text: "x" })); assert.strictEqual(r.status, 502);
});
await t("unknown task", async () => { const r = await claude(post("/api/claude", { task: "nope" })); assert.strictEqual(r.status, 400); });
await t("passcode", async () => {
  env.APP_PASSCODE = "1234";
  let r = await claude(post("/api/claude", { task: "check", text: "x" })); assert.strictEqual(r.status, 401);
  mockFetch({ content: [{ type: "text", text: '{"issues":[],"natural":"x"}' }] });
  r = await claude(post("/api/claude", { task: "check", text: "x" }, { "x-app-passcode": "1234" })); assert.strictEqual(r.status, 200);
  delete env.APP_PASSCODE;
});
await t("status", async () => {
  env.OPENAI_API_KEY = "o";
  const d = await (await status(new Request("http://x/api/status"))).json();
  assert.deepStrictEqual(d, { claude: true, provider: "claude", whisper: true, azure: false, passcode: false });
});
await t("transcribe", async () => {
  mockFetch({ text: " I am responsible on payouts ", duration: 3.2, segments: [{ start: 0, end: 1.5, text: "I am", id: 0 }] });
  const d = await (await transcribe(post("/api/transcribe", new Uint8Array([1, 2, 3]).buffer))).json();
  assert.strictEqual(d.text, "I am responsible on payouts"); assert.strictEqual(d.segments.length, 1);
  assert(last.opts.body instanceof FormData); assert.strictEqual(last.opts.body.get("language"), "en");
});
await t("pronounce", async () => {
  env.AZURE_SPEECH_KEY = "a"; env.AZURE_SPEECH_REGION = "westeurope";
  mockFetch({ RecognitionStatus: "Success", NBest: [{ Display: "Three trees.", PronunciationAssessment: { AccuracyScore: 80, FluencyScore: 90, CompletenessScore: 100, PronScore: 85 },
    Words: [{ Word: "three", PronunciationAssessment: { AccuracyScore: 55, ErrorType: "Mispronunciation" }, Phonemes: [{ Phoneme: "th", PronunciationAssessment: { AccuracyScore: 20 } }] }] }] });
  const d = await (await pronounce(post("/api/pronounce?ref=" + encodeURIComponent("Three trees."), new Uint8Array([1]).buffer))).json();
  assert.strictEqual(d.pron, 85); assert.strictEqual(d.words[0].phonemes[0].score, 20);
  assert(last.url.startsWith("https://westeurope.stt.speech.microsoft.com"));
  const cfg = JSON.parse(Buffer.from(last.opts.headers["Pronunciation-Assessment"], "base64").toString());
  assert.strictEqual(cfg.ReferenceText, "Three trees.");
});

console.log(fails ? fails + " failures" : "all function tests pass");
process.exit(fails ? 1 : 0);
