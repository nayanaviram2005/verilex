import { pool } from '../db/pool.js';
import { getActiveLLM } from '../llm/index.js';
import { getSourceById, listChunksForSource } from './cacheService.js';
import { getScenarioForSearch } from './searchService.js';

function findBestChunk(chunks, text) {
  if (!chunks.length || !text) return null;
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
  let best = null;
  let bestScore = 0;
  for (const chunk of chunks) {
    const chunkLower = chunk.text.toLowerCase();
    const score = words.reduce((acc, w) => (chunkLower.includes(w) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      best = chunk;
    }
  }
  return best;
}

/**
 * Grounded explanation flow. The LLM receives ONLY the selected source's
 * cached text (never general model knowledge) plus scenario text as
 * context. If the source has no cached text, the explanation states that
 * explicitly rather than inventing content.
 */
export async function explainSelectedSource({ searchId, sourceId, scenarioText: providedScenarioText }) {
  const source = await getSourceById(sourceId);
  if (!source) {
    const err = new Error('Selected legal source was not found in the local index.');
    err.status = 404;
    throw err;
  }

  let scenarioText = providedScenarioText;
  let relatedJudgments = [];

  if (searchId) {
    const scenario = await getScenarioForSearch(searchId);
    if (!scenarioText) scenarioText = scenario?.dispute || null;

    const { rows } = await pool.query(
      `SELECT ls.* FROM search_results sr
       JOIN legal_sources ls ON ls.id = sr.source_id
       WHERE sr.search_id = $1 AND ls.source_type IN ('judgment','order') AND ls.id != $2
       ORDER BY sr.rank ASC LIMIT 3`,
      [searchId, sourceId]
    );
    relatedJudgments = rows.map((r) => ({
      title: r.title,
      court: r.court,
      date: r.date,
      excerpt: r.full_text ? r.full_text.slice(0, 300) : null,
      url: r.url,
    }));
  }

  if (!scenarioText) {
    const err = new Error('A scenario description is required to generate an explanation.');
    err.status = 400;
    throw err;
  }

  const groundingText = source.full_text;
  const chunks = await listChunksForSource(sourceId);

  const llm = getActiveLLM();

  let explanationContent;
  if (!groundingText) {
    explanationContent = {
      whatItSays:
        'The full text of this source has not been retrieved/cached locally, so no plain-language summary can be produced from it. Open the original source to review its content.',
      whatRelates: 'Not available — no source text to compare against your description.',
      strongRelationship: 'Not available.',
      uncertain: 'The entire content of the provision is currently unverified locally.',
      exceptions: 'Not available.',
      whatThisDoesNotEstablish:
        'This does not establish any relationship between this source and your situation, because the underlying source text is not currently available in the local index.',
    };
  } else {
    explanationContent = await llm.explainRelevance({
      scenarioText,
      structuredScenario: null,
      source: {
        title: source.title,
        act: source.act,
        section: source.section,
        sourceType: source.source_type,
        jurisdiction: source.jurisdiction,
        currentStatus: source.current_status,
      },
      groundingText,
      relatedJudgments,
    });
  }

  const llmName = groundingText ? getActiveLLM().name : 'none';

  const { rows } = await pool.query(
    `INSERT INTO explanations (
       search_id, source_id, scenario_text, what_it_says, what_relates, strong_relationship,
       uncertain, exceptions, supporting_cases, what_this_does_not_establish, model, grounding_source_ids
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      searchId || null,
      sourceId,
      scenarioText,
      explanationContent.whatItSays,
      explanationContent.whatRelates,
      explanationContent.strongRelationship,
      explanationContent.uncertain,
      explanationContent.exceptions,
      JSON.stringify(relatedJudgments),
      explanationContent.whatThisDoesNotEstablish,
      llmName,
      JSON.stringify([sourceId]),
    ]
  );
  const explanation = rows[0];

  const bestChunk = findBestChunk(chunks, explanationContent.whatRelates || explanationContent.whatItSays);
  if (bestChunk) {
    await pool.query(
      `INSERT INTO source_references (explanation_id, chunk_id, excerpt) VALUES ($1,$2,$3)`,
      [explanation.id, bestChunk.id, bestChunk.text.slice(0, 500)]
    );
  }

  return { explanation, source, relatedJudgments, referencedChunk: bestChunk };
}

export async function getExplanation(id) {
  const { rows } = await pool.query(`SELECT * FROM explanations WHERE id = $1`, [id]);
  return rows[0] || null;
}
