import { config } from '../config.js';
import { OpenAILLMProvider } from './OpenAILLMProvider.js';
import { TemplateLLMProvider } from './TemplateLLMProvider.js';

let instance = null;

export function getActiveLLM() {
  if (instance) return instance;

  if (config.llmProvider === 'openai' && config.openai.apiKey) {
    instance = new OpenAILLMProvider(config.openai);
  } else {
    if (config.llmProvider === 'openai' && !config.openai.apiKey) {
      console.warn(
        '[llm] LLM_PROVIDER=openai but OPENAI_API_KEY is not set — falling back to the non-generative TemplateLLMProvider. ' +
          'Set OPENAI_API_KEY to enable AI-generated explanations.'
      );
    }
    instance = new TemplateLLMProvider();
  }
  return instance;
}
