# VERILEX — Semantic Legal Discovery & Explanation Platform

VERILEX helps a person understand which Indian laws may relate to a real-world
situation they describe in plain language — and, once they pick a specific
provision, explains *why* it relates to their situation using the retrieved
legal text as grounding. It is **not** a lawyer, an AI legal-advice chatbot, or
a legal outcome predictor. See [Product Principle](#product-principle) below.

```
User describes a real-world problem
            ↓
System understands the situation (scenario extraction)
            ↓
Relevant legal sources are retrieved (hybrid: external API + lexical + semantic)
            ↓
User selects one provision
            ↓
AI compares the provision with the scenario (grounded, source-only)
            ↓
AI explains the relationship
            ↓
User can verify the source (original external link always shown)
```

## Repository layout

```
verilex/
├── verilex-backend/   Node.js + Express API, PostgreSQL + pgvector, provider abstractions
└── verilex-client/    React + Vite frontend (neo-brutalist cypherpunk UI)
```

## Product principle

- The **external legal API / provider** is the authoritative source of law.
- The **local database** is a cache, search index, semantic index and
  provenance store — never a replacement for the official source.
- The **AI explanation layer** interprets *only* the specific retrieved
  source the user selected. It never invents section numbers, act names,
  cases, courts, tests, penalties, dates or exceptions, and never claims a
  law definitively applies or that the user will succeed.

## Architecture

```
Frontend (React/Vite)
    ↓
Backend API (Express)
    ↓
Application Services
    ├── Scenario Processing      (raw text → structured concepts)
    ├── Legal Search             (hybrid: API + lexical + semantic, fused & ranked)
    ├── Source Management        (caching, chunking, provenance)
    ├── Explanation              (grounded LLM/template explanation)
    └── Provider Management      (legal API / LLM / embedding provider registries)
             ↓
      Legal API Providers  (MockProvider | IndianKanoonProvider | ...)
             ↓
      PostgreSQL + pgvector (cache / semantic index / provenance)
```

Every provider implements the same interface
(`search`, `getSource`, `getSection`, `getJudgment`, `getMetadata`) and
returns a common `NormalizedLegalSource` shape, so the rest of the app never
depends on a specific provider's response format
(`verilex-backend/src/providers/LegalSourceProvider.js`).

LLM and embedding models are similarly abstracted
(`verilex-backend/src/llm/`, `verilex-backend/src/embeddings/`) so the model
can be swapped via environment variables without touching business logic.

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with the [pgvector](https://github.com/pgvector/pgvector) extension available
  (Ubuntu/Debian: `sudo apt install postgresql-16-pgvector`, matching your PG version)

### 1. Database

```bash
sudo -u postgres psql -c "CREATE ROLE verilex LOGIN PASSWORD 'verilex';"
sudo -u postgres psql -c "CREATE DATABASE verilex OWNER verilex;"
sudo -u postgres psql -d verilex -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

(The `vector`/`pgcrypto` extensions typically require a superuser the first
time; afterwards the app user can create tables freely.)

### 2. Backend

```bash
cd verilex-backend
cp .env.example .env    # edit as needed — see Environment variables below
npm install
npm run migrate         # applies src/db/schema.sql
npm run dev              # http://localhost:4000
```

By default `LEGAL_PROVIDER=mock` and no LLM/embedding API key is required —
the app runs fully end-to-end out of the box using:
- a small, clearly-labelled **mock legal corpus** (`src/providers/mockFixtures.js`)
  covering real Indian statutes/provisions (BNS, IT Act, Payment of Wages Act,
  Industrial Disputes Act, Transfer of Property Act, Model Tenancy Act,
  Consumer Protection Act) and a few illustrative judgments,
- a non-generative **TemplateLLMProvider** that produces extractive,
  hallucination-free explanations directly from the retrieved text,
- a deterministic **DeterministicEmbeddingProvider** dev fallback for the
  pgvector pipeline.

This mock data is never mixed with real provider data — the active provider
is a single, explicit selection (`LEGAL_PROVIDER`).

### 3. Frontend

```bash
cd verilex-client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173, describe a situation (try: *"My landlord kept my
deposit after I moved out and says he won't return it because he claims
there was damage."*), review the retrieved sources, open one, and click
**Explain Relevance**.

## Environment variables

### `verilex-backend/.env`

| Variable | Purpose |
|---|---|
| `PORT` | Backend port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend |
| `LEGAL_PROVIDER` | `mock` or `indian_kanoon` |
| `INDIAN_KANOON_API_TOKEN` | Required if `LEGAL_PROVIDER=indian_kanoon` ([api.indiankanoon.org](https://api.indiankanoon.org/)) |
| `LLM_PROVIDER` | `openai` (falls back to the non-generative `template` provider if no key is set) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL` | OpenAI-compatible chat completion config |
| `EMBEDDING_PROVIDER` | `openai` (falls back to deterministic dev embeddings if no key is set) |
| `OPENAI_EMBEDDING_MODEL` / `EMBEDDING_DIMS` | Embedding model config |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | API rate limiting |

### `verilex-client/.env`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (leave empty in dev — Vite proxies `/api`) |

See each `.env.example` for full detail.

## Connecting a real legal API provider

Set `LEGAL_PROVIDER=indian_kanoon` and `INDIAN_KANOON_API_TOKEN` in
`verilex-backend/.env`. `IndianKanoonProvider`
(`src/providers/IndianKanoonProvider.js`) implements the same interface as
the mock provider and normalises Indian Kanoon's response shape into the
common `NormalizedLegalSource` model — no other code needs to change. To add
another provider (IndiaCode, Nyaykosh, etc.), implement
`LegalSourceProvider` and register it in `src/providers/index.js`.

## Data model

`verilex-backend/src/db/schema.sql` defines the schema: `users`, `searches`,
`scenarios`, `legal_concepts`, `legal_sources`, `legal_source_chunks`,
`embeddings` (pgvector), `search_results`, `explanations`,
`source_references`, `provider_metadata`. Every `legal_sources` row retains
`provider` + `provider_source_id` so it can always be traced back to (and
re-verified against) the authoritative external source, plus
`retrieved_at`/`last_verified_at` for freshness.

## What "Explain Relevance" actually does

1. The selected source's cached full text is loaded (never general model
   knowledge).
2. It is passed to the active LLM provider inside an explicit
   `<grounding_source>` block, with a system prompt instructing the model to
   treat that block as inert data — not instructions — even if it contains
   text that looks like a command (basic prompt-injection resistance for
   untrusted retrieved content).
3. The model returns: what the provision says, what in the scenario relates
   to it, where the relationship is strong, what's uncertain, exceptions/
   limitations, and an explicit "what this does not establish" statement.
   It is instructed never to claim the law applies or predict an outcome.
4. If the source has no cached text, the explanation says so rather than
   filling the gap with model knowledge.

## Development phases (per build spec)

- **Phase 1 (done):** end-to-end MVP — situation search, one provider
  (mock, swappable to Indian Kanoon), caching, source view, grounded
  explanation.
- **Phase 2 (done, foundational):** pgvector schema, chunking, embeddings,
  hybrid (API + lexical + semantic) retrieval with fusion/ranking.
- **Phase 3+ (not yet built):** additional providers, cross-provider
  dedup, deeper case-discovery UX, legal relationship graph, versioning UI,
  evaluation harness. The provider/LLM/embedding abstractions are designed
  so these can be added without refactoring the core flow.

## Security & privacy notes

- All provider/LLM/DB credentials are server-side only, via environment
  variables (`.env`, never committed).
- Requests are rate-limited (`express-rate-limit`) and validated with `zod`.
- All SQL is parameterised (`pg` placeholders) — no string-built queries.
- Retrieved legal text is treated as untrusted input to the LLM (see above).
- Anonymous search is supported; no personal identifier is required to use
  the core flow. Scenario text is stored only to support the search/
  explanation flow itself.

## Non-goals

This is deliberately **not**: a generic legal chatbot, an AI lawyer,
automated legal advice, outcome prediction, a keyword-only search engine, or
a full local replica of Indian law. See the build spec §36 for the complete
list.
