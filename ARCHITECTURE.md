# Verilex — Core Idea & Technical Overview

## 1. What Verilex is

Verilex is a **semantic legal discovery and explanation platform** for Indian
legal research. A user describes a real-world situation in plain language
("my landlord won't return my security deposit," "I was falsely accused of
a sexual offence") and Verilex:

1. extracts the underlying legal concepts from that description,
2. retrieves actual, citable Indian legal provisions and judgments that may
   be relevant (via external legal-data providers, not invented text),
3. lets the user pick one specific source, and
4. generates a grounded, plain-English explanation of how *that specific
   source* relates to *that specific situation* — with nothing asserted
   that isn't traceable back to the retrieved text.

The product's one non-negotiable principle, enforced end-to-end in the
architecture, is:

> **Never fabricate legal data.** Every statute, section, or judgment shown
> to a user must originate from a real external legal source and must
> remain traceable back to it.

Verilex is explicitly **not** a lawyer, does not give legal advice, and does
not predict case outcomes. Every explanation carries that disclaimer, and
the UI footer repeats it on every page.

## 2. The core architectural idea: database as cache, not authority

The most important design decision in the whole system is this one:

**Postgres (with pgvector) is a cache, search index, and provenance store —
never the source of truth for law.**

- Every row in `legal_sources` keeps `provider` + `provider_source_id`,
  the exact identity of the external API record it came from, so it can
  always be re-fetched and re-verified against the original.
- The database exists purely to make retrieval fast (full-text search,
  vector similarity search) and to log *why* a result was surfaced
  (`search_results.retrieval_method`, `.reason`). It is disposable and
  rebuildable from the providers at any time.
- The AI explanation layer is only ever allowed to reason over text that
  is already anchored to a `legal_sources` row — it cannot introduce
  outside "knowledge" of Indian law into an explanation.

This one decision drives almost every other technical choice below:
provider abstraction, hybrid retrieval, and a strictly grounded LLM layer.

## 3. High-level architecture

```
┌────────────────────┐        ┌──────────────────────────────────────────┐
│   verilex-client    │  HTTP  │              verilex-backend              │
│  React + Vite SPA   │◄──────►│         Express REST API (Node.js)        │
│  (+ old-demo skin)  │        │                                            │
└────────────────────┘        │  ┌──────────────┐   ┌───────────────────┐ │
                                │  │   Auth layer  │   │   Search pipeline  │ │
                                │  │ Passport.js   │   │ scenario→retrieval  │ │
                                │  │ Google OAuth  │   │ →rank→explain        │ │
                                │  │ + local pw    │   └───────────────────┘ │
                                │  └──────────────┘             │            │
                                └────────────────────────────────┼────────────┘
                                                                  │
                        ┌─────────────────────────────────────────┼───────────────────────┐
                        ▼                                         ▼                        ▼
              ┌───────────────────┐                   ┌────────────────────┐   ┌────────────────────┐
              │ Legal source        │                   │ Postgres (Supabase) │   │ LLM / embedding      │
              │ providers            │  cache/index →    │ + pgvector           │   │ providers             │
              │ (Mock / IndianKanoon │ ───────────────►  │ (search cache,       │   │ (OpenAI / OpenRouter  │
              │  / InsightLaw)       │                    │  provenance store)   │   │  / template fallback) │
              └───────────────────┘                   └────────────────────┘   └────────────────────┘
```

Three independently swappable "provider" boundaries make the system
resilient and never dependent on a single vendor:

| Boundary | Purpose | Implementations |
|---|---|---|
| `LegalSourceProvider` | fetches real legal text | Mock (dev fixtures), IndianKanoon, InsightLaw |
| `LLMProvider` | generates grounded explanations / concept extraction | OpenAI, OpenRouter, Template (non-generative extractive fallback) |
| `EmbeddingProvider` | turns text into vectors for semantic search | OpenAI, Deterministic hash-based dev fallback |

Each boundary is a plain abstract base class with a small, explicit
interface (`search()`, `getSource()`, `getSection()`, etc. for legal
providers; `complete()` for LLMs; `embed()`/`embedQuery()` for embeddings),
so a new provider is a drop-in class, not a rewrite.

## 4. Backend (`verilex-backend`)

**Stack:** Node.js (ESM), Express 4, PostgreSQL (Supabase-hosted) + pgvector,
Zod for validation, Passport.js for auth, `pg` for the DB driver.

### 4.1 Request flow (situation search)

1. `POST /api/search` (situation mode) — Zod-validated body → `requireAuth`
   middleware (rejects unauthenticated requests at the API level, not just
   in the UI) → `scenarioService` extracts entities/events/concepts from
   the raw text via the active `LLMProvider`.
2. `searchService.runSituationSearch`:
   - **Provider fan-out**: calls `getActiveProviders()` (all enabled legal
     providers, e.g. Mock + IndianKanoon + InsightLaw simultaneously) via
     `Promise.allSettled`, so one provider failing never fails the whole
     search — failures are logged and skipped per-provider.
   - **Hybrid retrieval** against the Postgres cache: full-text search
     (`ts_rank` / `plainto_tsquery` over `legal_sources`/`legal_source_chunks`)
     + vector cosine-similarity search via pgvector (`embeddings` table).
   - **Fusion & ranking**: API results, lexical results, and semantic
     results are combined with weighted scoring
     (`WEIGHTS = { api, lexical, semantic, crossProviderBonus }`).
     Semantic-only matches are gated behind a meaningfulness check so a
     non-semantic hash-based embedding fallback can't leak irrelevant
     results by chance.
   - **Cross-provider deduplication**: results are grouped by a dedup key
     (Act+Section, else title) so the same statute returned by two
     providers is merged into one result, tagged with
     `mergedProviders: [...]`, and given a relevance bonus — while every
     source item still keeps its own provenance.
3. Results are persisted to `search_results` (rank, score, retrieval
   method, human-readable reason) and returned to the client.
4. `POST /api/explain` — given a `search_id` + a selected `source_id`, the
   `explanationService` builds a strictly-grounded prompt (scenario text +
   the exact retrieved source text, nothing else) and calls the active
   `LLMProvider`. The response is validated to only reference the supplied
   source before being stored in `explanations` and returned.

### 4.2 Authentication

- **Dual entry point, single flow**: Google OAuth (`passport-google-oauth20`)
  *and* email/password (`passport-local` + `bcryptjs`, cost factor 12) are
  both first-class — the frontend presents one login surface with a
  sign-in/sign-up toggle, not two separate systems.
- Sessions are stored server-side in Postgres via `connect-pg-simple`
  (`session` table) — no long-lived credential or token lives in browser
  storage; the backend is authoritative for auth state.
- `requireAuth` middleware protects **all** search/source/explanation
  routes at the API layer — a client can't bypass login by calling the API
  directly.

### 4.3 Data model (Postgres / Supabase)

Key tables (see `verilex-backend/src/db/schema.sql`):

- `users` — email/password hash *or* OAuth identity (`oauth_provider` +
  `oauth_provider_user_id`, unique together); a user can exist via either
  path.
- `session` — `express-session` store.
- `searches` → `scenarios` — the raw query and the structured
  understanding extracted from it.
- `legal_sources` — the provenance-anchored cache of an external record
  (`provider`, `provider_source_id` unique together; `current_status` tracks
  current/repealed/amended; full-text-search index via `tsvector`).
- `legal_source_chunks` — hierarchical breakdown (Act → Chapter → Section →
  Subsection → Clause, or Document → passage for judgments) used for
  precise retrieval and for grounding explanations in a specific excerpt.
- `embeddings` — pgvector column (`vector(1536)`), tied to the embedding
  `model` name so the index can be regenerated whenever the model changes.
- `search_results` — per-search ranked results with `retrieval_method`
  (`semantic` / `lexical` / `api` / `fused`) and a human-readable `reason`.
- `explanations` — the structured, grounded explanation output (what it
  says, what relates, strength of relationship, uncertainty, exceptions,
  supporting cases, and explicitly "what this does not establish"), plus
  `grounding_source_ids` so every explanation is auditable.
- `provider_metadata` — registry of configured legal-data providers.

The database runs on **Supabase-hosted Postgres** (chosen over a
self-managed local Postgres instance specifically to remove local DB setup
friction), with `pgvector` enabled as a Supabase extension.

### 4.4 Provider abstraction in detail

- `LegalSourceProvider` (base class) → `MockProvider` (deterministic dev
  fixtures, no network dependency), `IndianKanoonProvider`,
  `InsightLawProvider` — added as a **second, simultaneous** source
  alongside IndianKanoon (not a replacement), with tolerant multi-key field
  lookups since its exact response schema couldn't be verified against the
  live API in this environment; results from both are normalized into the
  same `legal_sources` shape before ranking.
- `LLMProvider` → `OpenAILLMProvider` and `OpenRouterLLMProvider` share an
  `OpenAICompatibleLLMProvider` base (same chat-completions-style
  interface, different base URL/key), plus `TemplateLLMProvider`, a
  **non-generative, purely extractive** fallback that works with zero API
  keys configured — it pattern-matches known legal concepts/keywords
  instead of calling any model, so the app is fully runnable without any
  LLM key.
- `EmbeddingProvider` → `OpenAIEmbeddingProvider` and a
  `DeterministicEmbeddingProvider` (hash-based, explicitly **not**
  semantically meaningful) dev fallback. The LLM and embeddings providers
  are intentionally decoupled — an OpenRouter key works for chat completion
  but not for OpenAI's embeddings endpoint, so the two are configured and
  selected independently rather than assumed to come from the same key.

## 5. Frontend

Two parallel builds share the same backend, routes, and auth flow, and
differ only in visual design system:

### 5.1 `verilex-client` — production design (neo-brutalist cypherpunk)

**Stack:** React 18 + React Router v6 + Vite 5 (no CSS framework — a
hand-written design-token stylesheet).

- Dark background, lime-green accent, thick borders, hard edges.
- **IBM Plex Mono used for all text, no exceptions** — labels, buttons,
  body copy, result cards.
- Skeleton loading states use a scan-line shimmer rather than a generic
  grey sweep, to read as "querying a system" rather than "waiting on a
  spinner."
- Route structure: public `/` (marketing/explainer only — **no simulated
  search**, nothing on the landing page performs or fakes a real query) →
  `/login` (Google OAuth + email/password, single entry point) → protected
  `/app` (situation search) → `/search/:searchId` → `/sources/:sourceId` /
  `/explanations/:explanationId` → `/account/searches` (history).
  `ProtectedRoute` redirects unauthenticated visitors to `/login`.

### 5.2 `verilex-client-old-demo` — generic-SaaS design (reference build)

A full functional copy of `verilex-client` — identical routes, identical
API calls, identical auth flow, zero logic changes — re-skinned with a
"default modern AI SaaS product" visual language for comparison: off-white
background, violet/pink mesh gradients, Inter/Plus Jakarta Sans, pill
buttons and badges, glassy rounded-2xl bento-grid cards, and a floating
sticky navbar. It additionally carries a landing-page-only "Try it now"
teaser: a fake multi-step analyzing animation followed by a blurred results
preview gated behind "Sign in to view these results" — a UI illusion of
usage with no real search executed, used purely to demonstrate a
bait-and-switch conversion pattern.

Both frontends run against the same backend on different dev ports (5173
vs 5174) and prove the same point: the entire visual identity is swappable
through CSS custom properties and shared class names without touching the
underlying application logic.

## 6. Cross-cutting technical principles

- **API-first, never fabricate**: legal content only ever originates from
  a real provider call; the database and the LLM layer are both
  downstream of that, never a source of new legal facts.
  - **Grounded generation**: the LLM is only given the scenario text and
  the one selected source's retrieved text — it cannot introduce outside
  claims, and its output is structured to explicitly separate what's
  certain, what's uncertain, and what the source does *not* establish.
- **Provider isolation**: every external dependency (legal data source,
  LLM, embedding model) is fronted by an abstract interface with multiple
  implementations, including a zero-external-dependency fallback, so the
  app is always runnable and a single vendor outage degrades gracefully
  instead of breaking the product.
- **Auth enforced server-side**: the frontend route guard is a UX
  convenience; the actual authorization boundary is the `requireAuth`
  Express middleware on every data-bearing route.
- **Full provenance chain**: raw query → structured scenario → ranked
  search results (with method + reason) → selected source → grounded
  explanation (with `grounding_source_ids`) — every step is persisted and
  traceable back to an external, re-verifiable legal record.
