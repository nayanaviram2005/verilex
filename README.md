# VERILEX — Semantic Legal Discovery & Explanation Platform

VERILEX helps a person understand which Indian laws may relate to a real-world
situation they describe in plain language — and, once they pick a specific
provision, explains *why* it relates to their situation using the retrieved
legal text as grounding. It is **not** a lawyer, an AI legal-advice chatbot, or
a legal outcome predictor. See [Product Principle](#product-principle) below.

```
HOMEPAGE (public — explains the product, no live search)
            ↓
SIGN IN / CREATE ACCOUNT (Google OAuth)
            ↓
APPLICATION (/app)
            ↓
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
├── verilex-backend/   Node.js + Express API, Supabase PostgreSQL + pgvector, provider abstractions
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
      Supabase PostgreSQL + pgvector (cache / semantic index / provenance)
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
- A [Supabase](https://supabase.com) project (free tier is enough) — **no
  local PostgreSQL install is required.**

### 1. Database (Supabase)

1. Create a project at [supabase.com](https://supabase.com/dashboard) (or
   reuse an existing one).
2. Enable the `vector` extension once: Supabase dashboard → **Database →
   Extensions** → search "vector" → enable. (If you skip this, it's fine —
   `npm run migrate` below also runs `CREATE EXTENSION IF NOT EXISTS
   vector`, which the Supabase `postgres` role is permitted to do.)
3. Grab your connection string: **Project Settings → Database →
   Connection string → URI**. Use the direct connection
   (`db.<project-ref>.supabase.co:5432`) unless your network blocks
   outbound port 5432, in which case use the session pooler string shown
   on the same page instead.
4. Paste it into `DATABASE_URL` in `verilex-backend/.env` (see step 2). TLS
   to Supabase is handled automatically — nothing else to configure.

That's it — the schema (tables, `session` table for auth, `vector`
extension) is created by running the migration in the next step, directly
against your Supabase database. There is nothing to install locally.

### 2. Backend

```bash
cd verilex-backend
cp .env.example .env
# Edit .env: set DATABASE_URL to your Supabase connection string (step 1)
# and SESSION_SECRET (openssl rand -base64 48) — these two are required.
npm install
npm run migrate         # applies src/db/schema.sql to your Supabase database
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

Open http://localhost:5173. You'll land on the public homepage; sign in
(see **Authentication** below — without Google credentials configured, the
login screen will say so, so set those up first) to reach `/app`, then
describe a situation (try: *"My landlord kept my deposit after I moved out
and says he won't return it because he claims there was damage."*), review
the retrieved sources, open one, and click **Explain Relevance**.

## Environment variables

### `verilex-backend/.env`

| Variable | Purpose |
|---|---|
| `PORT` | Backend port (default 4000) |
| `DATABASE_URL` | Supabase Postgres connection string — **required**, see Database (Supabase) above |
| `DATABASE_SSL` | `auto` (default, TLS on for any non-localhost host) / `true` / `false` |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend |
| `LEGAL_PROVIDER` | `mock` or `indian_kanoon` |
| `INDIAN_KANOON_API_TOKEN` | Required if `LEGAL_PROVIDER=indian_kanoon` ([api.indiankanoon.org](https://api.indiankanoon.org/)) |
| `LLM_PROVIDER` | `openai` (falls back to the non-generative `template` provider if no key is set) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL` | OpenAI-compatible chat completion config |
| `EMBEDDING_PROVIDER` | `openai` (falls back to deterministic dev embeddings if no key is set) |
| `OPENAI_EMBEDDING_MODEL` / `EMBEDDING_DIMS` | Embedding model config |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | API rate limiting |
| `SESSION_SECRET` | Signs the session cookie — **required**; generate with `openssl rand -base64 48` |
| `SESSION_COOKIE_SECURE` / `SESSION_COOKIE_SAMESITE` / `SESSION_MAX_AGE_MS` | Session cookie behaviour (see Authentication below) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth credentials (see Authentication below) |

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

## Authentication (Google OAuth + email/password)

An account is required to use the legal-search functionality. `/` is a
public, static landing page that explains the product and never performs a
real search or shows fabricated results — it exists purely to route a
visitor to sign-in. The actual application lives at `/app` (search, results,
source view, explanations, search history) and is gated both client-side
(`ProtectedRoute`, redirecting to `/login?returnTo=<destination>`) and
server-side (`requireAuth` on every `/api/search*`, `/api/sources/*` and
`/api/explain*` route) — the API rejects unauthenticated requests even if a
client bypassed the UI guard.

Two independent ways in, feeding the same user/session model:

```
                    AUTHENTICATION
                          │
             ┌────────────┴────────────┐
             ↓                         ↓
        GOOGLE OAUTH             EMAIL + PASSWORD
             │                         │
             └────────────┬────────────┘
                          ↓
                       USER (users table)
                          ↓
                  SESSION (Supabase Postgres-backed)
                          ↓
                     APPLICATION (/app)
```

Google is preferred (fewer steps, nothing to remember), but email/password
is always available — on `/login` and never gated behind OAuth being up —
so a Google outage, block, or simple preference never leaves someone
without a way to sign in.

**Google setup:**

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials),
   create an OAuth 2.0 Client ID (application type: Web application).
2. Add an Authorized redirect URI matching `GOOGLE_CALLBACK_URL`, e.g.
   `http://localhost:4000/api/auth/google/callback` for local dev.
3. In `verilex-backend/.env`, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_CALLBACK_URL`, and a `SESSION_SECRET` (`openssl rand -base64 48`).
4. Restart the backend. `GET /api/auth/status` and the login screen will now
   report Google sign-in as enabled.

If these are left unset, the app still runs — the login screen shows
"Google sign-in is not configured" and simply offers the email/password
form instead of erroring.

**Email/password:** no setup required — it works out of the box. On
`/login`, "Continue with Google" sits above a divider and an email/password
form with a sign-in/sign-up toggle; both paths land on the same screen, per
the single-entry-point approach.

- **Sign-up** (`POST /api/auth/signup`): validates email format and a
  password policy (8+ characters, at least one letter and one number) with
  `zod`, confirms `password === confirmPassword`, then hashes the password
  with `bcryptjs` (cost factor 12) — the plaintext password is never
  logged, stored, or sent anywhere else. If the email already belongs to a
  password account, sign-up is rejected (409, "already exists — sign in
  instead"); if it belongs to an OAuth-only account, the password is
  attached to that *same* account (see "same internal model" below) instead
  of creating a duplicate.
- **Sign-in** (`POST /api/auth/login`): a `passport-local` strategy
  (`src/auth/passport.js`) looks up the user by email and compares the
  submitted password against the stored hash with `bcrypt.compare`. An
  unknown email and a wrong password return the same generic "Invalid email
  or password" (401) so the endpoint can't be used to enumerate accounts.
  All credential verification happens here, server-side — the frontend
  never validates or hashes a password itself.
- Both `/api/auth/signup` and `/api/auth/login` sit behind a dedicated,
  tighter rate limit (`authRateLimiter`, 20 requests/15 min/IP) on top of
  the general API limit, to blunt credential-guessing attempts.
- **Duplicate/failure handling surfaced in the UI:** field-level errors
  (invalid email, weak password, mismatched confirmation) render inline
  under each input; account-level errors (duplicate email, wrong password)
  render as a form-level banner — both using the app's existing `.notice`/
  warn-color language, no separate error UI.

**How it works (shared by both methods):**

- Server-side only. Google goes through the standard
  `passport-google-oauth20` strategy (no manual OAuth token exchange, no
  client secret ever reaches the frontend); email/password goes through
  `passport-local` as above.
- Sessions are stored in your Supabase Postgres database
  (`connect-pg-simple`, `session` table — the same database everything
  else uses, no separate session store to run) and referenced by an
  `HttpOnly`, `SameSite=Lax` signed cookie
  (`verilex.sid`). No token or credential is ever placed in `localStorage`;
  the backend — not the client — decides whether a request is authenticated.
- **Same internal user model for both methods** (`users` table): OAuth
  sign-in populates `oauth_provider`/`oauth_provider_user_id`; password
  sign-up populates `password_hash`; either can be added to an existing
  account of the other kind by matching email (`upsertOAuthUser` /
  `setPasswordForUser` in `src/services/userService.js`), so a person never
  ends up with two disconnected accounts for the same email. Passwords are
  never sent to Google, and Google profile data never touches
  `password_hash`. Provider access/refresh tokens are never stored either.
- `GET /api/auth/me` returns the current session's user (or `null`);
  `GET /api/auth/google?returnTo=/path` starts Google sign-in and redirects
  back to `/path` after success (open-redirect protected — only a
  same-site relative path is honoured); `POST /api/auth/logout` destroys
  the session for either method identically.
- Adding a second OAuth provider later means registering another passport
  `Strategy` in `src/auth/passport.js` plus a matching
  `/api/auth/<provider>` route pair in `src/routes/auth.js` — no other code
  changes.
- `verilex-client/src/context/AuthContext.jsx` exposes
  `UNAUTHENTICATED | AUTHENTICATING | AUTHENTICATED | AUTH_ERROR | SESSION_EXPIRED`
  and drives the nav auth controls, the dedicated `/login` screen, and
  `ProtectedRoute` (redirects to `/login?returnTo=<original path>`, and
  returns there after sign-in — never just to the homepage).

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
- An account (Google OAuth) is required to run a search, since the platform
  keeps a per-account history; only the minimum profile fields are stored
  (see Authentication above), and scenario text is stored only to support
  the search/explanation flow itself — never used for model training.

## Non-goals

This is deliberately **not**: a generic legal chatbot, an AI lawyer,
automated legal advice, outcome prediction, a keyword-only search engine, or
a full local replica of Indian law. See the build spec §36 for the complete
list.
