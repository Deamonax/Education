// Shared helpers for the Tachles serverless functions.

export function env(name) {
  try { if (globalThis.Netlify && Netlify.env) { const v = Netlify.env.get(name); if (v) return v; } } catch (e) { /* ignore */ }
  return process.env[name];
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

// Optional passcode so a public URL can't burn the API keys.
export function guard(req) {
  const code = env("APP_PASSCODE");
  if (!code) return null;
  if (req.headers.get("x-app-passcode") === code) return null;
  return json({ error: "passcode" }, 401);
}

import TP from "../../js/prompts.js";
export const extractJson = TP.extractJson, cleanIssues = TP.cleanIssues, CATS = TP.CATS;
