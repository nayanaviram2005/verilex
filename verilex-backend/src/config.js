import 'dotenv/config';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  // Points at a Supabase Postgres connection string by default — see
  // verilex-backend/.env.example and README > Database (Supabase) for how
  // to obtain one. No local PostgreSQL install is required to run the app.
  databaseUrl: process.env.DATABASE_URL || '',
  // "auto" enables TLS unless the host is localhost/127.0.0.1 (matches
  // Supabase, which requires SSL, while staying friendly to a local/self-hosted
  // Postgres for anyone who still prefers one). Force with "true"/"false".
  databaseSsl: process.env.DATABASE_SSL || 'auto',

  // Primary legal source provider (mock | indian_kanoon). InsightLaw below
  // is queried ALONGSIDE this one, not instead of it — see
  // providers/index.js getActiveProviders() and services/searchService.js.
  legalProvider: process.env.LEGAL_PROVIDER || 'mock',
  indianKanoon: {
    apiToken: process.env.INDIAN_KANOON_API_TOKEN || '',
    baseUrl: process.env.INDIAN_KANOON_BASE_URL || 'https://api.indiankanoon.org',
  },
  // InsightLaw (https://insightlaw.in) — free, keyless Indian legal API
  // (Constitution/IPC/BNS/Kerala Acts). Enabled by default since it needs
  // no credentials; every result it returns is tagged provider:"insightlaw"
  // so it's never confused with the primary provider's results.
  insightLaw: {
    enabled: bool(process.env.INSIGHTLAW_ENABLED, true),
    baseUrl: process.env.INSIGHTLAW_BASE_URL || 'https://insightlaw.in',
    timeoutMs: Number(process.env.INSIGHTLAW_TIMEOUT_MS || 6000),
  },

  // LLM_PROVIDER=openai|openrouter|template. Kept separate from embeddings
  // below deliberately: OpenRouter is chat-completion-only (no /embeddings
  // endpoint), so pointing embeddings at it would silently break the
  // semantic index. Use LLM_PROVIDER=openrouter for explanations while
  // EMBEDDING_PROVIDER stays on real OpenAI (or the deterministic fallback).
  llmProvider: process.env.LLM_PROVIDER || 'openai',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    // Optional but recommended by OpenRouter for attribution/rankings.
    siteUrl: process.env.OPENROUTER_SITE_URL || process.env.CLIENT_ORIGIN || '',
    appName: process.env.OPENROUTER_APP_NAME || 'VERILEX',
  },
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
  embeddingDims: Number(process.env.EMBEDDING_DIMS || 1536),

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 60),
  },

  session: {
    secret: process.env.SESSION_SECRET || '',
    cookieSecure: bool(process.env.SESSION_COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    // SameSite=lax is fine for same-site dev (Vite proxy) and standard deployments
    // where the frontend and backend share a site; switch to 'none' (+ Secure)
    // only if they are deployed on genuinely different origins.
    sameSite: process.env.SESSION_COOKIE_SAMESITE || 'lax',
    maxAgeMs: Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30),
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback',
    },
  },

  isMockProvider() {
    return this.legalProvider === 'mock';
  },
};
