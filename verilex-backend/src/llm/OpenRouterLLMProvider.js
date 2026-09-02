import { OpenAICompatibleLLMProvider } from './OpenAICompatibleLLMProvider.js';

/**
 * OpenRouter (https://openrouter.ai) exposes an OpenAI-compatible
 * /chat/completions endpoint, so this is the same transport as
 * OpenAILLMProvider pointed at a different base URL/key/model — used only
 * for the explanation/scenario-extraction LLM. OpenRouter has no
 * /embeddings endpoint, so it is never used for the embeddings provider
 * (see embeddings/index.js, which stays on EMBEDDING_PROVIDER=openai or
 * the deterministic dev fallback).
 */
export class OpenRouterLLMProvider extends OpenAICompatibleLLMProvider {
  name = 'openrouter';

  constructor({ apiKey, baseUrl, model, siteUrl, appName }) {
    const extraHeaders = {};
    if (siteUrl) extraHeaders['HTTP-Referer'] = siteUrl;
    if (appName) extraHeaders['X-Title'] = appName;
    super({ apiKey, baseUrl, model, extraHeaders, requiredEnvHint: 'OPENROUTER_API_KEY' });
  }
}
