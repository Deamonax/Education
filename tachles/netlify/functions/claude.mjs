// POST /api/claude  {task, ...}  ->  JSON per task. Uses ANTHROPIC_API_KEY (+ optional CLAUDE_MODEL, CLAUDE_MODEL_FAST),
// or, when there is no Anthropic key, the free GROQ_API_KEY (+ optional GROQ_MODEL).
import { env, json, guard } from "../lib/shared.mjs";
import TP from "../../js/prompts.js";

export const config = { path: "/api/claude" };

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const g = guard(req); if (g) return g;
  const key = env("ANTHROPIC_API_KEY"), groq = env("GROQ_API_KEY");
  if (!key && !groq) return json({ error: "no_key" }, 503);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  const reqBody = TP.request(body, { main: env("CLAUDE_MODEL"), fast: env("CLAUDE_MODEL_FAST") });
  if (!reqBody) return json({ error: "unknown_task" }, 400);
  try {
    let text;
    if (key) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(reqBody)
      });
      if (!r.ok) return json({ error: "upstream", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
      const data = await r.json();
      text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
    } else {
      // Free option: Groq (OpenAI-compatible). Same prompts, other model.
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { authorization: "Bearer " + groq, "content-type": "application/json" },
        body: JSON.stringify(groqBody(reqBody, env("GROQ_MODEL") || "openai/gpt-oss-120b"))
      });
      if (r.status === 429) return json({ error: "busy", detail: "The free AI limit is reached for now. Try again in a minute." }, 429);
      if (!r.ok) return json({ error: "upstream", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
      const data = await r.json();
      text = ((data.choices || [])[0] || {}).message?.content || "";
    }
    return json(TP.finish(TP.extractJson(text)));
  } catch (e) {
    return json({ error: "failed", detail: String(e.message || e).slice(0, 200) }, 502);
  }
};

// Anthropic request -> OpenAI-style chat request.
export function groqBody(a, model) {
  const flat = c => typeof c === "string" ? c : (c || []).map(x => x.text || "").join("\n");
  return {
    model, temperature: 0.3, max_completion_tokens: Math.min(8000, (a.max_tokens || 2000) + 1500), reasoning_effort: "low",
    messages: [{ role: "system", content: a.system + "\n\nAnswer with JSON only." }].concat((a.messages || []).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: flat(m.content) })))
  };
}
