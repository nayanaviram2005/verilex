import { pool } from '../db/pool.js';

const MAX_CHUNK_CHARS = 900;

/**
 * Splits source full text into meaningful passages. Legislation is chunked
 * at paragraph/proviso boundaries approximating Section > Subsection >
 * Clause structure; judgments are chunked into passages. This is a
 * pragmatic splitter — provider-supplied structure should be preferred
 * where an API exposes it explicitly.
 */
function splitIntoPassages(text) {
  if (!text) return [];
  const paragraphs = text
    .split(/\n{2,}|(?<=\.)\s+(?=[A-Z][a-z]+\.—|Provided|Explanation)/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = '';
  for (const para of paragraphs) {
    if ((buffer + ' ' + para).length > MAX_CHUNK_CHARS && buffer) {
      chunks.push(buffer.trim());
      buffer = para;
    } else {
      buffer = buffer ? `${buffer} ${para}` : para;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks.length ? chunks : [text];
}

/**
 * Ensures a legal_source has legal_source_chunks. Idempotent: skips if
 * chunks already exist for this source.
 */
export async function ensureChunksForSource(source) {
  const { rows: existing } = await pool.query(
    `SELECT id FROM legal_source_chunks WHERE source_id = $1 LIMIT 1`,
    [source.id]
  );
  if (existing.length) return;
  if (!source.full_text) return;

  const level = ['act', 'section', 'rule', 'regulation'].includes(source.source_type) ? 'section' : 'passage';
  const passages = splitIntoPassages(source.full_text);

  for (let i = 0; i < passages.length; i++) {
    await pool.query(
      `INSERT INTO legal_source_chunks (source_id, level, heading, text, ordinal)
       VALUES ($1, $2, $3, $4, $5)`,
      [source.id, level, source.title, passages[i], i]
    );
  }
}
