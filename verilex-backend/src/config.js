import 'dotenv/config';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL || 'postgres://verilex:verilex@localhost:5432/verilex',

  legalProvider: process.env.LEGAL_PROVIDER || 'mock',
  indianKanoon: {
    apiToken: process.env.INDIAN_KANOON_API_TOKEN || '',
    baseUrl: process.env.INDIAN_KANOON_BASE_URL || 'https://api.indiankanoon.org',
  },

  llmProvider: process.env.LLM_PROVIDER || 'openai',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
  embeddingDims: Number(process.env.EMBEDDING_DIMS || 1536),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 60),
  },

  isMockProvider() {
    return this.legalProvider === 'mock';
  },
};
