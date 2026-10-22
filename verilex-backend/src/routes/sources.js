import { Router } from 'express';
import {
  getSourceById,
  listChunksForSource,
  starSource,
  unstarSource,
  isSourceStarred,
  listStarredSources,
} from '../services/cacheService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { pool } from '../db/pool.js';

export const router = Router();

router.get('/sources/:id', requireAuth, async (req, res, next) => {
  try {
    const source = await getSourceById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Legal source not found in the local index.' });

    const [chunks, starred] = await Promise.all([
      listChunksForSource(source.id),
      isSourceStarred(req.user.id, source.id),
    ]);

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
      starred,
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

router.put('/sources/:id/star', requireAuth, async (req, res, next) => {
  try {
    const source = await getSourceById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Legal source not found in the local index.' });
    await starSource(req.user.id, source.id);
    res.json({ starred: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/sources/:id/star', requireAuth, async (req, res, next) => {
  try {
    await unstarSource(req.user.id, req.params.id);
    res.json({ starred: false });
  } catch (err) {
    next(err);
  }
});

router.get('/starred', requireAuth, async (req, res, next) => {
  try {
    const starred = await listStarredSources(req.user.id);
    res.json({ starred });
  } catch (err) {
    next(err);
  }
});
