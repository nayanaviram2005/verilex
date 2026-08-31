import { Router } from 'express';
import { getSourceById, listChunksForSource } from '../services/cacheService.js';
import { pool } from '../db/pool.js';

export const router = Router();

router.get('/sources/:id', async (req, res, next) => {
  try {
    const source = await getSourceById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Legal source not found in the local index.' });

    const chunks = await listChunksForSource(source.id);

    let relatedBySameAct = [];
    if (source.act) {
      const { rows } = await pool.query(
        `SELECT id, title, section, source_type, url FROM legal_sources
         WHERE act = $1 AND id != $2 LIMIT 10`,
        [source.act, source.id]
      );
      relatedBySameAct = rows;
    }

    res.json({
      source,
      chunks,
      relatedProvisions: relatedBySameAct,
      provenance: {
        provider: source.provider,
        providerSourceId: source.provider_source_id,
        retrievedAt: source.retrieved_at,
        lastVerifiedAt: source.last_verified_at,
        note: 'This record is a locally cached, normalised copy for search and display. The linked external source remains authoritative.',
      },
    });
  } catch (err) {
    next(err);
  }
});
