import crypto from 'node:crypto';
import { pool } from '../db/pool.js';

const STALE_AFTER_MS = 1000 * 60 * 60 * 24 * 7; // 7 days — legal text is not assumed current indefinitely

function contentHash(source) {
  return crypto.createHash('sha256').update(source.fullText || source.title || '').digest('hex');
}

/**
 * Cache is a local index/provenance store, never the authority. Every row
 * retains provider + providerSourceId so the original source can always be
 * re-verified, and retrieved_at/last_verified_at so staleness is explicit.
 */
export async function getCachedSource(provider, providerSourceId) {
  const { rows } = await pool.query(
    `SELECT * FROM legal_sources WHERE provider = $1 AND provider_source_id = $2`,
    [provider, providerSourceId]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  const ageMs = Date.now() - new Date(row.last_verified_at).getTime();
  return { ...row, isStale: ageMs > STALE_AFTER_MS };
}

export async function upsertSource(normalized) {
  const hash = contentHash(normalized);
  const { rows } = await pool.query(
    `INSERT INTO legal_sources (
       provider, provider_source_id, title, source_type, url, act, section, court,
       jurisdiction, jurisdiction_level, state, date, effective_date, repeal_date,
       current_status, full_text, raw_provider_metadata, content_hash,
       retrieved_at, last_verified_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, now(), now())
     ON CONFLICT (provider, provider_source_id) DO UPDATE SET
       title = EXCLUDED.title,
       source_type = EXCLUDED.source_type,
       url = EXCLUDED.url,
       act = EXCLUDED.act,
       section = EXCLUDED.section,
       court = EXCLUDED.court,
       jurisdiction = EXCLUDED.jurisdiction,
       jurisdiction_level = EXCLUDED.jurisdiction_level,
       state = EXCLUDED.state,
       date = EXCLUDED.date,
       effective_date = EXCLUDED.effective_date,
       repeal_date = EXCLUDED.repeal_date,
       current_status = EXCLUDED.current_status,
       full_text = COALESCE(EXCLUDED.full_text, legal_sources.full_text),
       raw_provider_metadata = EXCLUDED.raw_provider_metadata,
       content_hash = EXCLUDED.content_hash,
       last_verified_at = now()
     RETURNING *`,
    [
      normalized.provider,
      normalized.providerSourceId,
      normalized.title,
      normalized.sourceType,
      normalized.url,
      normalized.act,
      normalized.section,
      normalized.court,
      normalized.jurisdiction,
      normalized.jurisdictionLevel || 'unknown',
      normalized.state,
      normalized.date,
      normalized.effectiveDate,
      normalized.repealDate,
      normalized.currentStatus || 'unknown',
      normalized.fullText,
      JSON.stringify(normalized.rawProviderMetadata || {}),
      hash,
    ]
  );
  return rows[0];
}

export async function getSourceById(id) {
  const { rows } = await pool.query(`SELECT * FROM legal_sources WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function listChunksForSource(sourceId) {
  const { rows } = await pool.query(
    `SELECT * FROM legal_source_chunks WHERE source_id = $1 ORDER BY ordinal ASC`,
    [sourceId]
  );
  return rows;
}
