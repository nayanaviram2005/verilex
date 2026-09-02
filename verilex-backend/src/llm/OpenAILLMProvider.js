import { OpenAICompatibleLLMProvider } from './OpenAICompatibleLLMProvider.js';

export class OpenAILLMProvider extends OpenAICompatibleLLMProvider {
  name = 'openai';

  constructor({ apiKey, baseUrl, model }) {
    super({ apiKey, baseUrl, model, requiredEnvHint: 'OPENAI_API_KEY' });
  }
}
