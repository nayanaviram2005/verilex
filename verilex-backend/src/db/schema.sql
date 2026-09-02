-- Semantic Legal Discovery & Explanation Platform — database schema
--
-- The database is a CACHE, SEARCH INDEX and PROVENANCE STORE.
-- It is never the authoritative source of law. Every legal_sources row
-- retains its external provider identity (provider + provider_source_id)
-- so the original can always be traced and re-verified.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------
-- Users (minimal — an account is required to use legal-search
-- functionality; see requireAuth on the search/source/explain routes).
-- Authentication is OAuth-only (see "OAuth identity" below); no password
-- credentials or provider access tokens are stored here.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent additions for OAuth identity (safe to re-run on an existing DB).
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider_user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_oauth_identity_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_oauth_identity_unique UNIQUE (oauth_provider, oauth_provider_user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Sessions — backing store for express-session (connect-pg-simple).
-- The backend, not the client, is authoritative for auth state; no
-- long-lived credential is ever kept in browser storage.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- ---------------------------------------------------------------------
-- Searches — one per "describe your situation" submission
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'situation' CHECK (mode IN ('situation', 'source', 'case')),
  raw_query TEXT NOT NULL,
  state TEXT,
  incident_date DATE,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Scenario — structured understanding extracted from raw_query
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  matter TEXT,
  entities JSONB NOT NULL DEFAULT '[]'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  dispute TEXT,
  concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_model_output JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Legal concepts — controlled-ish vocabulary used for retrieval/ranking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Legal sources — normalised cache of an external provider's record.
-- The provider + provider_source_id pair is the anchor to the
-- authoritative external source; this table never claims to BE the law.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('act', 'section', 'rule', 'regulation', 'judgment', 'order', 'other')),
  url TEXT,
  act TEXT,
  section TEXT,
  court TEXT,
  jurisdiction TEXT,
  jurisdiction_level TEXT CHECK (jurisdiction_level IN ('central', 'state', 'unknown')),
  state TEXT,
  date DATE,
  effective_date DATE,
  repeal_date DATE,
  current_status TEXT NOT NULL DEFAULT 'unknown' CHECK (current_status IN ('current', 'repealed', 'amended', 'unknown')),
  replacement_provider_source_id TEXT,
  full_text TEXT,
  raw_provider_metadata JSONB,
  content_hash TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_source_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_sources_type ON legal_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_legal_sources_jurisdiction ON legal_sources(jurisdiction_level, state);
CREATE INDEX IF NOT EXISTS idx_legal_sources_act_section ON legal_sources(act, section);
CREATE INDEX IF NOT EXISTS idx_legal_sources_fts ON legal_sources USING gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(full_text,'')));

-- ---------------------------------------------------------------------
-- Legal source chunks — structural pieces (Act > Chapter > Section >
-- Subsection > Clause, or Document > passage for judgments)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  parent_chunk_id UUID REFERENCES legal_source_chunks(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('act', 'chapter', 'section', 'subsection', 'clause', 'passage')),
  heading TEXT,
  text TEXT NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chunks_source ON legal_source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON legal_source_chunks USING gin (to_tsvector('english', text));

-- ---------------------------------------------------------------------
-- Embeddings — pgvector, tied to a model/version so the index can be
-- regenerated when the embedding model changes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID REFERENCES legal_source_chunks(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  dims INTEGER NOT NULL,
  vector vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_id);
-- ivfflat index requires ANALYZE + populated data; created by a migration script once data exists.

-- ---------------------------------------------------------------------
-- Search results — what was retrieved for a given search, with rank/why
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS search_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  score DOUBLE PRECISION,
  retrieval_method TEXT NOT NULL CHECK (retrieval_method IN ('semantic', 'lexical', 'api', 'fused')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_results_search ON search_results(search_id);

-- ---------------------------------------------------------------------
-- Explanations — grounded AI explanation of a selected source vs scenario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID REFERENCES searches(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES legal_sources(id) ON DELETE CASCADE,
  scenario_text TEXT NOT NULL,
  what_it_says TEXT,
  what_relates TEXT,
  strong_relationship TEXT,
  uncertain TEXT,
  exceptions TEXT,
  supporting_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  what_this_does_not_establish TEXT,
  model TEXT NOT NULL,
  grounding_source_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explanations_source ON explanations(source_id);

-- ---------------------------------------------------------------------
-- Source references — links an explanation's claims to specific chunks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  explanation_id UUID NOT NULL REFERENCES explanations(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES legal_source_chunks(id) ON DELETE SET NULL,
  excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Provider metadata — registry of configured legal API providers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provider_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  base_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
