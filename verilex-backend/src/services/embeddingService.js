import { pool } from '../db/pool.js';
import { getActiveEmbeddingProvider } from '../embeddings/index.js';

function toVectorLiteral(vector) {
  return `[${vector.join(',')}]`;
}

/**
 * Generates and stores embeddings for any chunks of a source that don't yet
 * have one for the currently active embedding model. Embeddings are tied to
 * model + version so the index can be regenerated when the model changes.
 */
export async function ensureEmbeddingsForSource(sourceId) {
  const provider = getActiveEmbeddingProvider();

  const { rows: chunks } = await pool.query(
    `SELECT c.id, c.text FROM legal_source_chunks c
     WHERE c.source_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM embeddings e WHERE e.chunk_id = c.id AND e.model = $2
       )`,
    [sourceId, provider.model]
  );

  for (const chunk of chunks) {
    const vector = await provider.embed(chunk.text);
    await pool.query(
      `INSERT INTO embeddings (chunk_id, source_id, model, dims, vector) VALUES ($1,$2,$3,$4,$5)`,
      [chunk.id, sourceId, provider.model, vector.length, toVectorLiteral(vector)]
    );
  }
}

export async function embedQuery(text) {
  const provider = getActiveEmbeddingProvider();
  const vector = await provider.embed(text);
  return { vector, model: provider.model };
}

/**
 * Cosine-similarity search over the semantic index for the currently active
 * embedding model. Returns source ids ranked by similarity.
 */
export async function semanticSearch(queryVector, model, limit = 15) {
  const { rows } = await pool.query(
    `SELECT source_id, MIN(vector <=> $1) AS distance
     FROM embeddings
     WHERE model = $2
     GROUP BY source_id
     ORDER BY distance ASC
     LIMIT $3`,
    [toVectorLiteral(queryVector), model, limit]
  );
  return rows.map((r) => ({ sourceId: r.source_id, distance: Number(r.distance), similarity: 1 - Number(r.distance) }));
}
