import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { explainSelectedSource, getExplanation } from '../services/explanationService.js';
import { pool } from '../db/pool.js';

export const router = Router();

const explainSchema = z.object({
  sourceId: z.string().uuid(),
  searchId: z.string().uuid().optional(),
  scenarioText: z.string().max(4000).optional(),
});

router.post('/explain', validateBody(explainSchema), async (req, res, next) => {
  try {
    const { sourceId, searchId, scenarioText } = req.validatedBody;
    const result = await explainSelectedSource({ sourceId, searchId, scenarioText });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/explain/:id', async (req, res, next) => {
  try {
    const explanation = await getExplanation(req.params.id);
    if (!explanation) return res.status(404).json({ error: 'Explanation not found.' });

    let referencedChunks = [];
    const { rows } = await pool.query(
      `SELECT sr.*, c.text AS chunk_text, c.heading AS chunk_heading
       FROM source_references sr
       LEFT JOIN legal_source_chunks c ON c.id = sr.chunk_id
       WHERE sr.explanation_id = $1`,
      [explanation.id]
    );
    referencedChunks = rows;

    res.json({ explanation, referencedChunks });
  } catch (err) {
    next(err);
  }
});
