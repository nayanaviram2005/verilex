import { config } from '../config.js';
import { OpenAIEmbeddingProvider } from './OpenAIEmbeddingProvider.js';
import { DeterministicEmbeddingProvider } from './DeterministicEmbeddingProvider.js';

let instance = null;

export function getActiveEmbeddingProvider() {
  if (instance) return instance;

  if (config.embeddingProvider === 'openai' && config.openai.apiKey) {
    instance = new OpenAIEmbeddingProvider({
      apiKey: config.openai.apiKey,
      baseUrl: config.openai.baseUrl,
      model: config.openai.embeddingModel,
      dims: config.embeddingDims,
    });
  } else {
    if (config.embeddingProvider === 'openai' && !config.openai.apiKey) {
      console.warn(
        '[embeddings] EMBEDDING_PROVIDER=openai but OPENAI_API_KEY is not set — falling back to ' +
          'DeterministicEmbeddingProvider (dev-only, not semantically meaningful).'
      );
    }
    instance = new DeterministicEmbeddingProvider({ dims: config.embeddingDims });
  }
  return instance;
}
