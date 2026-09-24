# Verilex — Database Operations

This document is a dedicated deep-dive into **how Verilex actually uses its
database** day to day: connection handling, migrations, every read/write
path, caching/staleness rules, and the retrieval queries. For the broader
system design (why the DB exists at all, and how it fits with the provider
abstraction), see `ARCHITECTURE.md` — the core rule from there still
governs everything here:

> **Postgres is a cache, search index, and provenance store — never the
> authoritative source of law.**

## 1. Engine & connection

- **Engine**: PostgreSQL, hosted on **Supabase**, with the `pgvector`
  extension enabled for semantic search and `pgcrypto` for `gen_random_uuid()`.
- **Driver**: `pg` (`node-postgres`), used directly — no ORM. All queries in
  the codebase are hand-written parameterized SQL (`$1, $2, …`), never
  string-interpolated, to avoid SQL injection.
- **Connection pool** — `verilex-backend/src/db/pool.js`:
  ```js
  export const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: resolveSsl(),
  });
  ```
  - `DATABASE_URL` comes from `config.databaseUrl` (`.env`, Supabase's
    connection string from Project Settings → Database).
  - `DATABASE_SSL` controls TLS: `auto` (default) enables
    `{ rejectUnauthorized: false }` for any non-`localhost` host (Supabase
    always requires TLS), and disables it automatically for a local dev
    Postgres — so the same code path works against Supabase or a local
    instance without extra config.
  - `query(text, params)` — a thin wrapper around `pool.query`, used for
    the vast majority of one-shot statements.
  - `withClient(fn)` — checks out a single connection from the pool for
    a caller that needs more than one statement to share a session, and
    always releases it (`finally`).
  - `withTransaction(fn)` — wraps `withClient` in `BEGIN` / `COMMIT`, with
    automatic `ROLLBACK` on any thrown error. (Available for multi-statement
    atomic writes; most current write paths are single-statement upserts
    that don't need it.)

## 2. Schema & migrations

- **Schema file**: `verilex-backend/src/db/schema.sql` — a single,
  hand-maintained SQL file (not a migration-history tool like
  Knex/Prisma/Flyway). It's written to be **fully idempotent**:
  - every `CREATE TABLE` uses `IF NOT EXISTS`
  - every `CREATE INDEX` uses `IF NOT EXISTS`
  - new columns added after the initial design use
    `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (e.g. the OAuth identity
    columns on `users`)
  - a new constraint is guarded with a `DO $$ ... IF NOT EXISTS ... $$`
    block (e.g. `users_oauth_identity_unique`)
- **Applying it**: `npm run migrate` (backend) → runs
  `src/scripts/migrate.js`, which just reads `schema.sql` and executes it
  verbatim against `DATABASE_URL`, then closes the pool:
  ```js
  const sql = readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  ```
  Because every statement is idempotent, **running the migration again on
  an existing database is always safe** — it's the mechanism used both for
  first-time setup and for rolling forward schema changes (add the new
  `ALTER TABLE IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` statements to
  `schema.sql`, re-run `npm run migrate`).
- There is deliberately no down-migration / rollback tooling — the schema
  is additive-only by convention.

## 3. Tables and what writes to them

| Table | Written by | Purpose |
|---|---|---|
| `users` | `userService.js` | Account records — OAuth and/or password identity |
| `session` | `connect-pg-simple` (auto-managed) | Server-side session store for `express-session` |
| `searches` | `searchService.js` | One row per situation/source/case query |
| `scenarios` | `scenarioService.js` | Structured extraction (entities/events/concepts) from a search |
| `legal_sources` | `cacheService.js` | Normalized cache of a provider's record, keyed by provider identity |
| `legal_source_chunks` | `chunkingService.js` | Passage/section-level breakdown of a source's text |
| `embeddings` | `embeddingService.js` | pgvector embeddings per chunk, tagged by model |
| `search_results` | `searchService.js` | Ranked results for a search, with method + human-readable reason |
| `explanations` | `explanationService.js` | Grounded AI explanation output for a (search, source) pair |
| `source_references` | `explanationService.js` | Links an explanation's claims to specific source chunks |
| `provider_metadata` | (seed/admin) | Registry of configured legal-data providers |

## 4. The caching / provenance path (`cacheService.js`)

This is the core operation that keeps the DB honest as "cache, not
authority."

### `upsertSource(normalized)`
Every result returned by any `LegalSourceProvider` is written here as an
**upsert**, keyed by the natural key `(provider, provider_source_id)`:

```sql
INSERT INTO legal_sources (...) VALUES (...)
ON CONFLICT (provider, provider_source_id) DO UPDATE SET
  title = EXCLUDED.title,
  ...
  full_text = COALESCE(EXCLUDED.full_text, legal_sources.full_text),
  last_verified_at = now()
RETURNING *;
```

Key behaviors:
- **Never loses text**: `full_text = COALESCE(EXCLUDED.full_text, legal_sources.full_text)`
  means a provider response that doesn't include full text (e.g. a
  search-result stub) never blanks out text that was already cached from a
  fuller fetch.
- **Content hash**: `content_hash = sha256(full_text || title)` is stored
  on every write, so a future diffing/change-detection feature could tell
  whether a cached provision actually changed on a re-fetch, not just that
  it was re-verified.
- **`retrieved_at` vs `last_verified_at`**: `retrieved_at` is set once on
  first insert; `last_verified_at` is bumped to `now()` on every re-fetch
  (including a no-op re-fetch), so the cache always knows how recently a
  row was confirmed against the live provider.
- **Staleness**: `getCachedSource(provider, providerSourceId)` computes
  `isStale = (now - last_verified_at) > 7 days` on read. Legal text is
  never assumed current indefinitely — this flag exists so calling code
  (or a future background re-verification job) can decide to re-fetch
  rather than trust an old cache entry.

### `ensureChunksForSource(source)` (`chunkingService.js`)
Idempotent: `SELECT ... LIMIT 1` first — if chunks already exist for that
`source_id`, it's a no-op. Otherwise it splits `full_text` into passages
(paragraph/proviso-boundary heuristic, capped at ~900 chars per chunk) and
bulk-inserts `legal_source_chunks` rows with an `ordinal` so original
document order is preserved.

### `ensureEmbeddingsForSource(sourceId)` (`embeddingService.js`)
Also idempotent, but keyed on **model**, not just source:
```sql
SELECT c.id, c.text FROM legal_source_chunks c
WHERE c.source_id = $1
  AND NOT EXISTS (
    SELECT 1 FROM embeddings e WHERE e.chunk_id = c.id AND e.model = $2
  )
```
Only chunks that don't yet have an embedding for the *currently active*
embedding model are embedded and inserted. This means switching the
embedding provider/model doesn't require a destructive migration — old
vectors stay (tagged with their own `model` value), and new ones are
generated alongside them on next access. A failure here (e.g. embedding
API down) is caught and logged by the caller, never allowed to fail the
whole search.

Every provider result run through `cacheAndIndex()` in `searchService.js`
goes through all three steps in sequence: upsert → chunk → embed, with
per-source error isolation (one bad source failing to cache never drops
the rest of the batch).

## 5. Retrieval queries

### Lexical (full-text) search
```sql
SELECT id, ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(full_text,'')),
                    plainto_tsquery('english', $1)) AS rank
FROM legal_sources
WHERE to_tsvector(...) @@ plainto_tsquery('english', $1)
ORDER BY rank DESC LIMIT $2;
```
Backed by the GIN index `idx_legal_sources_fts` (declared in `schema.sql`
over `to_tsvector('english', title || full_text)`), so this scan is
index-accelerated rather than a sequential scan even as the cache grows.

### Semantic (vector) search
```sql
SELECT source_id, MIN(vector <=> $1) AS distance
FROM embeddings
WHERE model = $2
GROUP BY source_id
ORDER BY distance ASC LIMIT $3;
```
- `<=>` is pgvector's cosine-distance operator; `similarity = 1 - distance`.
- Grouped by `source_id` with `MIN(distance)` because a source can have
  multiple chunk-level embeddings — the closest chunk decides the source's
  overall semantic relevance.
- Always scoped to a single `model`, so a source with vectors from two
  different embedding models (after a provider switch) is only compared
  against same-model vectors — mixing distance values across models would
  be meaningless.
- An `ivfflat` approximate-nearest-neighbor index is noted in the schema as
  something to be created once real data exists (`ANALYZE` + a populated
  table are prerequisites for a useful ivfflat index) — with the dataset
  sizes in dev/staging, the plain `<=>` distance scan is fast enough
  without it.

### Fusion (`runSituationSearch` / `runSourceSearch` in `searchService.js`)
Not a single SQL query — an application-level merge:
1. Provider results are cached (writes, see §4), producing a set of
   `legal_sources` rows with position-based scores (`WEIGHTS.api`).
2. Cross-provider duplicates are merged in-memory by an Act+Section (or
   title) key, before scoring — so two providers returning the same
   provision contribute one candidate with a bonus, not two competing rows.
3. Lexical hits and semantic hits are fetched by the two queries above and
   merged into the same in-memory `Map` (keyed by `source_id`), adding to
   an existing candidate's score or creating a new one with a fresh
   `SELECT * FROM legal_sources WHERE id = $1` fetch if the DB row wasn't
   already loaded.
4. A semantic-only candidate (found by vector search but not by API or
   lexical) is only kept if the active embedding provider is genuinely
   semantic (`isSemanticallyMeaningful`) **and** clears a minimum score
   threshold — this is what prevents the non-meaningful hash-based dev
   embedding fallback from injecting noise results.
5. User-supplied filters (`sourceType`, `act`, `currentStatus`, `state`)
   are applied as a hard `Array.filter` narrow over the fused candidates —
   filters only ever narrow real cached rows, never synthesize new ones.
6. The top 20 scored candidates are persisted, one `INSERT` per result,
   into `search_results` with `rank`, `score`, `retrieval_method` (always
   `'fused'` for this path — `'semantic'` / `'lexical'` / `'api'` remain
   available in the schema for future single-method paths), and a
   generated `reason` string.

### Reads for the UI
- `getSearchResults(searchId)` — joins `search_results` to `legal_sources`
  via `row_to_json(ls.*)`, ordered by `rank`, so the API can return each
  result with its full cached source inline in one round trip.
- `listSearchesForUser(userId)` — `LEFT JOIN` + `count(sr.id)` grouped by
  search, for the "My Searches" history page (result count without a
  second query per row).
- `getSearchById`, `getScenarioForSearch`, `getSourceById`,
  `listChunksForSource` — simple keyed lookups.

## 6. Auth-related DB operations (`userService.js`)

- **`upsertOAuthUser`** implements a three-way match so a person can't end
  up with duplicate accounts depending on which auth method they used
  first:
  1. Match by `(oauth_provider, oauth_provider_user_id)` — existing OAuth
     user → update profile fields + `last_login_at`.
  2. Else, if an `email` is present, match by `email` where
     `oauth_provider IS NULL` (an existing **password** account with the
     same email) → link OAuth onto that same row (`UPDATE ... SET
     oauth_provider = ..., oauth_provider_user_id = ...`), rather than
     creating a second user.
  3. Else → `INSERT` a brand-new user.
  - No OAuth access/refresh tokens are ever stored — only the minimal
    profile (`name`, `profile_image_url`, provider identity).
- **`createLocalUser(email, passwordHash)`** — the route layer
  (`routes/auth.js`) hashes the password with `bcryptjs` (cost 12) before
  this is ever called; this function and the DB never see a plaintext
  password.
- **`setPasswordForUser`** — used both for a password change and for an
  OAuth-first user adding a password fallback onto their existing account
  (same row, same dual-model reasoning as `upsertOAuthUser`).
- **`users_oauth_identity_unique`** constraint on
  `(oauth_provider, oauth_provider_user_id)` — DB-level guarantee against
  duplicate OAuth identities even under concurrent requests, not just an
  application-level check.

## 7. Session storage

- `connect-pg-simple` owns the `session` table entirely (schema declared
  once in `schema.sql` for completeness/idempotency, but the package
  manages reads/writes/expiry itself at runtime).
- Sessions are looked up by `sid` (primary key) on every authenticated
  request; `idx_session_expire` supports the package's periodic cleanup of
  expired rows.
- This is what makes the backend authoritative for auth state — a client
  only ever holds an opaque session cookie, never a credential or claim
  the server has to trust blindly.

## 8. Write-path failure isolation

Every DB write that happens as a side effect of an external call (provider
search, embedding generation) is wrapped so a partial failure degrades
gracefully instead of aborting the request:

- `cacheAndIndex()` catches per-source: if `upsertSource` throws for one
  provider result, that one is logged and skipped — the rest of the batch
  still gets cached.
- `ensureEmbeddingsForSource` failures are caught separately from the
  `upsertSource`/`ensureChunksForSource` calls, so an embedding-provider
  outage still leaves the source cached and lexically searchable, just not
  yet semantically indexed.
- `runProviderSearch` isolates failures **per legal-data provider**
  (`Promise.allSettled`) before any DB write happens at all — one
  provider being down never blocks the others from being cached.
