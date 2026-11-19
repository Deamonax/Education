// POST /api/claude  {task, ...}  ->  JSON per task. Uses ANTHROPIC_API_KEY (+ optional CLAUDE_MODEL, CLAUDE_MODEL_FAST).
import { env, json, guard } from "../lib/shared.mjs";
import TP from "../../js/prompts.js";

export const config = { path: "/api/claude" };

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const g = guard(req); if (g) return g;
  const key = env("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "no_key" }, 503);
  let body;
  try { body = await req.json(); } catch (e) { return json({ error: "bad_json" }, 400); }
  const reqBody = TP.request(body, { main: env("CLAUDE_MODEL"), fast: env("CLAUDE_MODEL_FAST") });
  if (!reqBody) return json({ error: "unknown_task" }, 400);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(reqBody)
    });
    if (!r.ok) return json({ error: "upstream", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");
    return json(TP.finish(TP.extractJson(text)));
  } catch (e) {
    return json({ error: "failed", detail: String(e.message || e).slice(0, 200) }, 502);
  }
};
