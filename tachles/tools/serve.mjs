// Local test server: static files + /api/* either mocked (MOCK=1) or "not configured" (MOCK=0).
// node tools/serve.mjs [port]
import http from "http"; import fs from "fs"; import path from "path"; import url from "url";
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const port = +process.argv[2] || 8765, MOCK = process.env.MOCK !== "0";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png" };
export const calls = [];
function mock(task, body) {
  if (task === "check") {
    const t = body.text || "", issues = [];
    if (t.includes("responsible on")) issues.push({ original: "responsible on", fix: "responsible for", cat: "prep", en: "Responsible takes for.", he: "אחראית על = responsible for", severity: 3 });
    if (t.includes("until Friday")) issues.push({ original: "until Friday", fix: "by Friday", cat: "prep", en: "Deadline: by.", he: "עד = by", severity: 3 });
    if (/\bi will\b/.test(t)) issues.push({ original: "i will", fix: "I will", cat: "caps", en: "Capital I.", he: "I תמיד גדולה", severity: 2 });
    let natural = t.replace("responsible on", "responsible for").replace("until Friday", "by Friday").replace(/\bi will\b/, "I will");
    return { issues, natural, tone: { direct: /^Send me/m.test(t), note_en: /^Send me/m.test(t) ? "Starts with a command." : "", note_he: "" } };
  }
  if (task === "analyze") return { issues: [{ original: "I work here five years", fix: "I've worked here for five years", cat: "perfect", en: "Present perfect.", he: "הווה מושלם", severity: 3 }, { original: "responsible on", fix: "responsible for", cat: "prep", en: "for", he: "על = for", severity: 3 }], strengths: ["Clear"], summary_en: "ok" };
  if (task === "roleplay") { const n = (body.history || []).filter(m => m.role === "me").length; return { reply: n >= 3 ? "Great, let's do that. Thanks!" : "Interesting. Why now, and what would you cut?", done: n >= 3 }; }
  if (task === "debrief") return { fixes: [{ original: "make a meeting", fix: "set up a meeting", cat: "calque", en: "Set up a meeting.", he: "לקבוע פגישה = set up", severity: 3 }], good: ["You gave a clear reason."], phrase: "Let's circle back on that.", phrase_why: "To park a topic.", errors: 4 };
  if (task === "prepare") return { sentences: [1, 2, 3, 4, 5].map(i => ({ en: "Sentence number " + i + " for the call.", why: "Use it early." })), scenario: { title: "Call with the bank", brief: "Explain the delay.", partner: "Priya. Polite.", open: "Hi, what's going on with the payouts?" } };
  if (task === "judge") return { ok: /^ok/i.test(body.answer || ""), fix: "", en: "", he: "" };
  return { error: "unknown" };
}
http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) {
    let chunks = []; req.on("data", c => chunks.push(c)); req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const send = (code, obj) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(obj)); };
      if (u.pathname === "/api/sync") { // in-memory version of netlify/functions/sync.mjs
        const code = (u.searchParams.get("code") || "").toUpperCase(); globalThis.__sync = globalThis.__sync || new Map(); const m = globalThis.__sync;
        if (process.env.PASSCODE && req.headers["x-app-passcode"] !== process.env.PASSCODE) return send(401, { error: "passcode" });
        if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return send(400, { error: "code" });
        if (req.method === "GET") return m.has(code) ? send(200, m.get(code)) : send(200, { missing: true });
        const b = JSON.parse(raw.toString() || "{}"), cur = m.get(code);
        if (cur && cur.at !== (b.base || 0) && cur.at >= (b.base || 0)) return send(409, cur);
        if (b.data && b.data.settings) { delete b.data.settings.apiKey; delete b.data.settings.passcode; }
        m.set(code, { at: b.at, data: b.data }); return send(200, { ok: true, at: b.at });
      }
      if (u.pathname === "/api/status") return send(200, MOCK ? { claude: true, whisper: true, azure: true, passcode: false } : { claude: false, whisper: false, azure: false, passcode: false });
      if (!MOCK) return send(503, { error: "no_key" });
      if (u.pathname === "/api/claude") { const b = JSON.parse(raw.toString() || "{}"); calls.push(b.task); return setTimeout(() => send(200, mock(b.task, b)), 80); }
      if (u.pathname === "/api/transcribe") return send(200, { text: "So I work here five years and I'm responsible on the payouts team and we make a meeting every week with the bank.", duration: 6, segments: [{ start: 0, end: 2, text: "a" }, { start: 2.8, end: 6, text: "b" }] });
      if (u.pathname === "/api/pronounce") { const ref = u.searchParams.get("ref") || ""; return send(200, { text: ref, pron: 78, accuracy: 74, fluency: 88, completeness: 100, words: ref.split(/\s+/).filter(Boolean).map((w, i) => ({ w, score: i % 3 ? 90 : 52, error: "None", phonemes: [{ p: "th", score: i % 3 ? 90 : 40 }] })) }); }
      return send(404, { error: "nf" });
    });
    return;
  }
  let p = path.join(root, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" }); fs.createReadStream(p).pipe(res);
}).listen(port, () => console.log("serving on", port, MOCK ? "(mock api)" : "(no api)"));
