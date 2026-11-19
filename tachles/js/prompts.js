/* Tachles prompts: shared by the Netlify function and the browser (direct mode). UMD-style plain script. */
(function (root) {
const CATS = ["article", "perfect", "copula", "question", "it", "countable", "comparative", "there", "order", "ifwhen",
  "prep", "calque", "tone", "runon", "caps", "homophone", "spelling", "agreement", "colloc", "other"];
const LEARNER = `The learner is a Group Product Manager at a fintech company. Her native language is Hebrew. She speaks good English but not fluently; her grammar has fossilized errors and many errors come from translating Hebrew word for word. Her biggest goal is error-free professional writing in AMERICAN English.`;

const RULES = `Correction rules:
- Only correct what an educated American colleague would actually correct. Never "fix" correct English or impose style preferences. When in doubt, do not correct.
- Use American spelling and usage (prioritize, color, "the team is").
- Pay special attention to Hebrew transfer errors: missing a/an, "the" with general nouns, missing present perfect ("I work here 5 years"), missing is/are, questions without do/does/did, he/she for things, informations/advices/feedbacks, "more better", prepositions (responsible on, until Friday for a deadline, depends in, wait to, explain me), literal translations (return to you = get back to you, make a meeting, take a decision, in the last time, succeed to), comma splices, missing capitals (i, monday, english), its/it's, then/than, and tone that is too direct for American work culture.
- Category for each issue, exactly one of: ${CATS.join(", ")}. (prep = preposition, calque = literal translation, tone = too direct, runon = comma splice or run-on, caps = capitals, colloc = wrong verb+noun pair, ifwhen = will after if/when, it = he/she for a thing, there = there is vs have, order = word order, perfect = present perfect vs past, copula = missing is/are, countable = uncountable nouns, homophone = sound-alike words.)
- "original" must be an exact substring of her text (short: just the words around the error). "fix" is the corrected version of that same substring.
- "en": one short sentence explaining the rule in plain English. "he": the same in natural, simple Hebrew, naming the Hebrew source of the error when there is one (for example: "אחראית על = responsible for").
- severity: 3 = changes meaning or looks unprofessional, 2 = clearly wrong, 1 = minor.
- Never use em dashes.`;

function sys(extra) { return `${LEARNER}\n\n${RULES}\n\n${extra}\n\nReply with ONE JSON object only, no markdown, no text before or after.`; }

const TASKS = {
  check: (b) => ({
    system: sys(`Task: review a ${b.kind || "work text"} she wrote. Find every real error. Then write "natural": the full text rewritten as a fluent American colleague would write it, keeping her meaning, structure and voice, with the minimum change needed${b.tone && b.tone !== "keep" ? `, and adjusted to be ${b.tone === "shorter" ? "shorter and tighter" : b.tone}` : ""}. Placeholders like [NAME_1] or [AMOUNT_1] must be kept exactly. Also judge the tone for American work culture.
JSON shape: {"issues":[{"original":"","fix":"","cat":"","en":"","he":"","severity":2}],"natural":"","tone":{"direct":false,"note_en":"","note_he":""}}`),
    user: String(b.text || "").slice(0, 8000), max: 3000
  }),
  analyze: (b) => ({
    system: sys(`Task: analyze ${b.source === "speech" ? "a transcript of her SPEAKING (verbatim speech-to-text). Ignore fillers (um, uh), false starts, missing punctuation and capitals; only count grammar, word choice and literal-translation errors" : "a text she WROTE"}. List every real error. Also give "strengths": up to 3 short things she did well, and "summary_en": one sentence.
JSON shape: {"issues":[{"original":"","fix":"","cat":"","en":"","he":"","severity":2}],"strengths":[""],"summary_en":""}`),
    user: String(b.text || "").slice(0, 12000), max: 3500
  }),
  roleplay: (b) => {
    const s = b.scenario || {};
    return {
      system: `You are role-playing a work conversation to help a non-native speaker practice. ${LEARNER}
Scenario: ${s.title || ""}. ${s.brief || ""}
You play: ${s.partner || "a colleague"}.
Stay in character as a natural American colleague. Keep each reply short (1 to 3 sentences, like real speech), ask follow-up questions, react to what she says, and push back a little where the character would. Never correct her English during the role-play and never mention that this is practice. If she has clearly reached the goal of the scenario, wrap up naturally. Never use em dashes.
Reply with JSON only: {"reply":"","done":false}`,
      messages: (b.history || []).slice(-30).map(m => ({ role: m.role === "me" ? "user" : "assistant", content: m.role === "me" ? m.text : JSON.stringify({ reply: m.text, done: false }) })),
      max: 400
    };
  },
  debrief: (b) => ({
    system: sys(`Task: she just finished a spoken role-play ("${(b.scenario || {}).title || ""}"). Her lines are speech-to-text transcripts: ignore fillers, punctuation and capitals. Pick AT MOST 3 corrections that matter most at work (frequent errors and Hebrew transfer errors first). Give "good": up to 2 specific things she did well. Give "phrase": one natural phrase an American PM would have used in this conversation, with a short "phrase_why". Also estimate "errors": the total number of real errors you noticed (not only the 3).
JSON shape: {"fixes":[{"original":"","fix":"","cat":"","en":"","he":"","severity":2}],"good":[""],"phrase":"","phrase_why":"","errors":0}`),
    user: (b.history || []).map(m => (m.role === "me" ? "HER: " : "PARTNER: ") + m.text).join("\n").slice(0, 12000), max: 1500
  }),
  prepare: (b) => ({
    system: sys(`Task: she has this situation coming up at work and wants to prepare. Give 5 sentences she will probably need, in natural American work English, each with a short "why" (when to use it). Target the Hebrew transfer errors she would likely make in this situation. Then design a short role-play for it.
JSON shape: {"sentences":[{"en":"","why":""}],"scenario":{"title":"","brief":"","partner":"","open":""}}`),
    user: String(b.situation || "").slice(0, 2000), max: 1500
  }),
  judge: (b) => ({
    system: sys(`Task: she answered a translation or rewrite drill. Decide if her answer is correct, natural American English that keeps the meaning and avoids the target mistake. Small differences in wording are fine. If not fully correct, give the minimal fix.
JSON shape: {"ok":true,"fix":"","en":"","he":""}`),
    user: `Hebrew prompt: ${b.he || "(none)"}\nTask: ${b.task || "translate"}\nTarget mistake to avoid: ${b.trap || ""}\nModel answer: ${b.model || ""}\nHer answer: ${b.answer || ""}`, max: 500
  })
};


// which model tier each task uses: fast tasks need short answers quickly
const FAST = { roleplay: true, judge: true };
// Pull the first JSON object out of a model reply.
function extractJson(text) {
  const s = String(text || "");
  const start = s.indexOf("{");
  if (start < 0) throw new Error("no json");
  let depth = 0, inStr = false, escp = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (escp) escp = false; else if (c === "\\") escp = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return JSON.parse(s.slice(start, i + 1)); }
  }
  throw new Error("unclosed json");
}

// Keep only well-formed issues with a known category; never more than max.
function cleanIssues(list, max = 50) {
  return (Array.isArray(list) ? list : []).filter(x => x && typeof x.original === "string" && typeof x.fix === "string" && x.original.trim() && x.original.trim() !== x.fix.trim())
    .map(x => ({ original: x.original.trim(), fix: x.fix.trim(), cat: CATS.includes(x.cat) ? x.cat : "other",
      en: String(x.en || "").slice(0, 300), he: String(x.he || "").slice(0, 300), severity: [1, 2, 3].includes(x.severity) ? x.severity : 2 }))
    .slice(0, max);
}

function finish(out) {
  if (out.issues) out.issues = cleanIssues(out.issues);
  if (out.fixes) out.fixes = cleanIssues(out.fixes, 3);
  return out;
}
// Build an Anthropic Messages API request body for a task.
function request(body, models) {
  const make = TASKS[body.task];
  if (!make) return null;
  const t = make(body);
  const messages = t.messages && t.messages.length ? t.messages : [{ role: "user", content: t.user || "(start)" }];
  if (messages[0].role !== "user") messages.unshift({ role: "user", content: "(The conversation starts.)" });
  models = models || {};
  return { model: FAST[body.task] ? (models.fast || "claude-haiku-5-5") : (models.main || "claude-sonnet-5-5"), max_tokens: t.max || 2000, system: t.system, messages };
}
const TP = { CATS, TASKS, request, extractJson, cleanIssues, finish };
root.TP = TP;
if (typeof module !== "undefined") module.exports = TP;
})(typeof window !== "undefined" ? window : globalThis);
