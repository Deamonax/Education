// GET /api/status -> which services are configured (no secrets).
import { env, json } from "../lib/shared.mjs";
export const config = { path: "/api/status" };
export default async () => json({
  claude: !!(env("ANTHROPIC_API_KEY") || env("GROQ_API_KEY")),
  provider: env("ANTHROPIC_API_KEY") ? "claude" : env("GROQ_API_KEY") ? "groq" : null,
  whisper: !!(env("OPENAI_API_KEY") || env("GROQ_API_KEY")),
  azure: !!(env("AZURE_SPEECH_KEY") && env("AZURE_SPEECH_REGION")),
  passcode: !!env("APP_PASSCODE")
});
