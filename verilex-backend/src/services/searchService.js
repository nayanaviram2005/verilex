import { pool } from '../db/pool.js';
import { getActiveProvider } from '../providers/index.js';
import { buildScenario } from './scenarioService.js';
import { upsertSource } from './cacheService.js';
import { ensureChunksForSource } from './chunkingService.js';
import { ensureEmbeddingsForSource } from './embeddingService.js';
import { embedQuery, semanticSearch } from './embeddingService.js';

const WEIGHTS = { api: 3, lexical: 2, semantic: 2.5 };

function buildReason(source, concepts) {
  const sourceConcepts = source.rawProviderMetadata?.concepts || [];
  const overlap = sourceConcepts.filter((c) =>
    concepts.some((sc) => sc.toLowerCase() === c.toLowerCase() || c.toLowerCase().includes(sc.toLowerCase()))
  );
  if (overlap.length) {
    return `This source was retrieved because it addresses ${overlap.slice(0, 3).join(', ')}, which overlaps with concepts identified in your description.`;
  }
  if (source.excerpt) {
    return `This source was retrieved based on textual/semantic similarity to your description. Excerpt: "${source.excerpt.slice(0, 160)}${source.excerpt.length > 160 ? '…' : ''}"`;
  }
  return 'This source was retrieved based on similarity to your description. Review the source text to judge relevance.';
}

async function runProviderSearch(queryText, filters) {
  const provider = getActiveProvider();
  try {
    const results = await provider.search(queryText, filters);
    return results;
  } catch (err) {
    console.error('[search] provider search failed:', err.message);
    return [];
  }
}

async function cacheAndIndex(normalizedResults) {
  const cachedSources = [];
  for (const normalized of normalizedResults) {
    try {
      const row = await upsertSource(normalized);
      await ensureChunksForSource(row);
      try {
        await ensureEmbeddingsForSource(row.id);
      } catch (embedErr) {
        console.warn('[search] embedding generation failed for source', row.id, embedErr.message);
      }
      cachedSources.push({ row, normalized });
    } catch (err) {
      console.error('[search] failed to cache source', normalized.providerSourceId, err.message);
    }
  }
  return cachedSources;
}

async function lexicalSearch(queryText, limit = 15) {
  const { rows } = await pool.query(
    `SELECT id, ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(full_text,'')), plainto_tsquery('english', $1)) AS rank
     FROM legal_sources
     WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(full_text,'')) @@ plainto_tsquery('english', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    [queryText, limit]
  );
  return rows.map((r) => ({ sourceId: r.id, score: Number(r.rank) }));
}

/**
 * Hybrid retrieval: external API search (authoritative candidate source),
 * local lexical search (keyword precision), and local semantic search
 * (concept-level recall) are fused, ranked and deduplicated. The user's
 * chosen filters (jurisdiction/state, source type, act, status) narrow the
 * final candidate set — they are never invented if not supplied.
 */
export async function runSituationSearch({ userId, rawQuery, state, incidentDate, filters = {} }) {
  const { rows: searchRows } = await pool.query(
    `INSERT INTO searches (user_id, mode, raw_query, state, incident_date, filters)
     VALUES ($1,'situation',$2,$3,$4,$5) RETURNING *`,
    [userId || null, rawQuery, state || null, incidentDate || null, JSON.stringify(filters)]
  );
  const search = searchRows[0];

  const scenario = await buildScenario(search.id, rawQuery);
  const concepts = Array.isArray(scenario.concepts) ? scenario.concepts : [];
  const queryText = [rawQuery, ...concepts].join(' ');

  const providerFilters = { ...filters, state: state || filters.state };
  const providerResults = await runProviderSearch(queryText, providerFilters);
  const cached = await cacheAndIndex(providerResults);

  const lexicalHits = await lexicalSearch(queryText);

  let semanticHits = [];
  try {
    const { vector, model } = await embedQuery(queryText);
    semanticHits = await semanticSearch(vector, model);
  } catch (err) {
    console.warn('[search] semantic search unavailable:', err.message);
  }

  const fused = new Map();

  cached.forEach(({ row, normalized }, idx) => {
    const positionScore = WEIGHTS.api * (1 - idx / Math.max(providerResults.length, 1));
    fused.set(row.id, {
      row,
      normalized,
      score: positionScore,
      methods: new Set(['api']),
    });
  });

  for (const hit of lexicalHits) {
    const existing = fused.get(hit.sourceId);
    if (existing) {
      existing.score += WEIGHTS.lexical * hit.score;
      existing.methods.add('lexical');
    } else {
      const { rows } = await pool.query(`SELECT * FROM legal_sources WHERE id = $1`, [hit.sourceId]);
      if (rows[0]) fused.set(hit.sourceId, { row: rows[0], score: WEIGHTS.lexical * hit.score, methods: new Set(['lexical']) });
    }
  }

  for (const hit of semanticHits) {
    const existing = fused.get(hit.sourceId);
    if (existing) {
      existing.score += WEIGHTS.semantic * hit.similarity;
      existing.methods.add('semantic');
    } else {
      const { rows } = await pool.query(`SELECT * FROM legal_sources WHERE id = $1`, [hit.sourceId]);
      if (rows[0]) fused.set(hit.sourceId, { row: rows[0], score: WEIGHTS.semantic * hit.similarity, methods: new Set(['semantic']) });
    }
  }

  // Drop candidates that only surfaced via a weak semantic-only match — this
  // keeps a crude/deterministic embedding fallback from flooding results
  // with noise; anything also confirmed by the API or lexical search stays.
  const SEMANTIC_ONLY_MIN_SCORE = 1.5;
  let candidates = [...fused.values()].filter((c) => {
    const onlySemantic = c.methods && c.methods.size === 1 && c.methods.has('semantic');
    return !onlySemantic || c.score >= SEMANTIC_ONLY_MIN_SCORE;
  });

  // apply user-supplied filters as a hard narrow, never inventing values
  if (filters.sourceType) candidates = candidates.filter((c) => c.row.source_type === filters.sourceType);
  if (filters.act) candidates = candidates.filter((c) => c.row.act?.toLowerCase().includes(filters.act.toLowerCase()));
  if (filters.currentStatus) candidates = candidates.filter((c) => c.row.current_status === filters.currentStatus);
  if (state) candidates = candidates.filter((c) => !c.row.state || c.row.state.toLowerCase() === state.toLowerCase() || c.row.jurisdiction_level === 'central');

  candidates.sort((a, b) => b.score - a.score);
  candidates = candidates.slice(0, 20);

  const persisted = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const reason = buildReason(
      { ...c.row, rawProviderMetadata: c.row.raw_provider_metadata, excerpt: c.normalized?.excerpt },
      concepts
    );
    const { rows } = await pool.query(
      `INSERT INTO search_results (search_id, source_id, rank, score, retrieval_method, reason)
       VALUES ($1,$2,$3,$4,'fused',$5) RETURNING *`,
      [search.id, c.row.id, i + 1, c.score, reason]
    );
    persisted.push({ ...rows[0], source: c.row });
  }

  return { search, scenario: { ...scenario, concepts }, results: persisted };
}

export async function getSearchResults(searchId) {
  const { rows } = await pool.query(
    `SELECT sr.*, row_to_json(ls.*) AS source
     FROM search_results sr
     JOIN legal_sources ls ON ls.id = sr.source_id
     WHERE sr.search_id = $1
     ORDER BY sr.rank ASC`,
    [searchId]
  );
  return rows;
}

export async function listSearchesForUser(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT s.*, count(sr.id) AS result_count
     FROM searches s
     LEFT JOIN search_results sr ON sr.search_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function getSearchById(searchId) {
  const { rows } = await pool.query(`SELECT * FROM searches WHERE id = $1`, [searchId]);
  return rows[0] || null;
}

export async function getScenarioForSearch(searchId) {
  const { rows } = await pool.query(`SELECT * FROM scenarios WHERE search_id = $1`, [searchId]);
  return rows[0] || null;
}

/**
 * Legal Source Search mode — for users who already know an Act/section or
 * legal term. Uses the same provider abstraction and fusion path, just
 * without scenario extraction.
 */
export async function runSourceSearch({ userId, rawQuery, filters = {} }) {
  const { rows: searchRows } = await pool.query(
    `INSERT INTO searches (user_id, mode, raw_query, filters) VALUES ($1,'source',$2,$3) RETURNING *`,
    [userId || null, rawQuery, JSON.stringify(filters)]
  );
  const search = searchRows[0];

  const providerResults = await runProviderSearch(rawQuery, filters);
  const cached = await cacheAndIndex(providerResults);
  const lexicalHits = await lexicalSearch(rawQuery);

  const fused = new Map();
  cached.forEach(({ row, normalized }, idx) => {
    fused.set(row.id, { row, normalized, score: WEIGHTS.api * (1 - idx / Math.max(providerResults.length, 1)) });
  });
  for (const hit of lexicalHits) {
    const existing = fused.get(hit.sourceId);
    if (existing) existing.score += WEIGHTS.lexical * hit.score;
  }

  let candidates = [...fused.values()];
  if (filters.sourceType) candidates = candidates.filter((c) => c.row.source_type === filters.sourceType);
  candidates.sort((a, b) => b.score - a.score);
  candidates = candidates.slice(0, 20);

  const persisted = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const { rows } = await pool.query(
      `INSERT INTO search_results (search_id, source_id, rank, score, retrieval_method, reason)
       VALUES ($1,$2,$3,$4,'fused',$5) RETURNING *`,
      [search.id, c.row.id, i + 1, c.score, 'Matched your search terms directly.']
    );
    persisted.push({ ...rows[0], source: c.row });
  }
  return { search, results: persisted };
}

/**
 * Similar Case Search mode — semantic + API discovery restricted to judgments/orders.
 */
export async function runCaseSearch({ userId, rawQuery, filters = {} }) {
  return runSourceSearch({ userId, rawQuery, filters: { ...filters, sourceType: filters.sourceType || 'judgment' } });
}
