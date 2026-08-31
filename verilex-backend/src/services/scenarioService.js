import { pool } from '../db/pool.js';
import { getActiveLLM } from '../llm/index.js';

/**
 * Converts a raw user description into the internal structured
 * representation used for retrieval/ranking. This representation is a
 * retrieval aid — it must never be exposed as an assertion that any
 * extracted concept legally applies.
 */
export async function buildScenario(searchId, rawQuery) {
  const llm = getActiveLLM();
  const structured = await llm.extractScenario(rawQuery);

  const { rows } = await pool.query(
    `INSERT INTO scenarios (search_id, matter, entities, events, dispute, concepts, raw_model_output)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      searchId,
      structured.matter || null,
      JSON.stringify(structured.entities || []),
      JSON.stringify(structured.events || []),
      structured.dispute || null,
      JSON.stringify(structured.concepts || []),
      JSON.stringify(structured),
    ]
  );
  return rows[0];
}
