/**
 * OneRead — AI provider status check.
 *
 * Prints the configured AI provider + Gemini model/temperature config and
 * whether GEMINI_API_KEY is present. NEVER prints the key value.
 *
 * Usage: npm run ai:status
 */

import { getLlmStatus } from "../lib/llm";
import { getGeminiProviderStatus, geminiConfigured } from "../lib/ai";

function main() {
  const llm = getLlmStatus();
  const g = getGeminiProviderStatus();

  console.log("OneRead — AI provider status");
  console.log("============================");
  console.log(`AI_PROVIDER          : ${llm.provider}`);
  console.log(`Provider configured  : ${llm.configured ? "yes" : "no"}`);
  console.log(`NODE_ENV             : ${process.env.NODE_ENV ?? "development"}`);
  console.log("");
  console.log("Gemini");
  console.log("------");
  console.log(`GEMINI_API_KEY       : ${geminiConfigured() ? "configured" : "MISSING"}`);
  console.log(`Active provider      : ${g.isActiveProvider ? "yes" : "no"}`);
  console.log(`Model (fast)         : ${g.models.fast}`);
  console.log(`Model (quality)      : ${g.models.quality}`);
  console.log(`Model (reasoning)    : ${g.models.reasoning}`);
  console.log(`Temperature default  : ${g.temperatureDefault}`);
  console.log(`Max output tokens    : ${g.maxOutputTokens}`);
  console.log("");
  console.log("Fallback providers");
  console.log("------------------");
  console.log(`OPENAI_API_KEY       : ${llm.hasOpenAiKey ? "configured" : "missing"}`);
  console.log(`ANTHROPIC_API_KEY    : ${llm.hasAnthropicKey ? "configured" : "missing"}`);
  console.log("");

  if (g.isActiveProvider && !geminiConfigured()) {
    console.log(
      "WARNING: AI_PROVIDER=gemini but GEMINI_API_KEY is not set. Generation will fail and content will not be sent.",
    );
    process.exitCode = 2;
  } else if (!llm.configured) {
    console.log(
      "NOTE: No AI provider configured — products fall back to dev heuristics (dev only). Set AI_PROVIDER=gemini + GEMINI_API_KEY.",
    );
  } else {
    console.log("OK: AI provider is configured.");
  }
}

main();
