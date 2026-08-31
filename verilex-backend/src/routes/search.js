import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { runSituationSearch, runSourceSearch, runCaseSearch, getSearchResults, getSearchById, getScenarioForSearch } from '../services/searchService.js';

export const router = Router();

const filtersSchema = z
  .object({
    sourceType: z.enum(['act', 'section', 'rule', 'regulation', 'judgment', 'order', 'other']).optional(),
    act: z.string().max(200).optional(),
    court: z.string().max(200).optional(),
    currentStatus: z.enum(['current', 'repealed', 'amended', 'unknown']).optional(),
  })
  .optional()
  .default({});

const situationSchema = z.object({
  query: z.string().min(10, 'Please describe your situation in a bit more detail.').max(4000),
  state: z.string().max(100).optional(),
  incidentDate: z.string().date().optional().or(z.literal('').transform(() => undefined)),
  filters: filtersSchema,
});

const sourceSearchSchema = z.object({
  query: z.string().min(2).max(500),
  filters: filtersSchema,
});

router.post('/search/situation', validateBody(situationSchema), async (req, res, next) => {
  try {
    const { query, state, incidentDate, filters } = req.validatedBody;
    const result = await runSituationSearch({
      userId: req.userId || null,
      rawQuery: query,
      state,
      incidentDate,
      filters,
    });

    if (result.results.length === 0) {
      return res.json({
        search: result.search,
        scenario: result.scenario,
        results: [],
        notice: 'No sufficiently relevant source was found in the available legal sources.',
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/search/source', validateBody(sourceSearchSchema), async (req, res, next) => {
  try {
    const { query, filters } = req.validatedBody;
    const result = await runSourceSearch({ userId: req.userId || null, rawQuery: query, filters });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/search/case', validateBody(sourceSearchSchema), async (req, res, next) => {
  try {
    const { query, filters } = req.validatedBody;
    const result = await runCaseSearch({ userId: req.userId || null, rawQuery: query, filters });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/search/:id', async (req, res, next) => {
  try {
    const search = await getSearchById(req.params.id);
    if (!search) return res.status(404).json({ error: 'Search not found.' });
    const [scenario, results] = await Promise.all([
      getScenarioForSearch(search.id),
      getSearchResults(search.id),
    ]);
    res.json({ search, scenario, results });
  } catch (err) {
    next(err);
  }
});
