import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { router as searchRoutes } from './routes/search.js';
import { router as sourceRoutes } from './routes/sources.js';
import { router as explainRoutes } from './routes/explain.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json({ limit: '256kb' }));
app.use('/api', apiRateLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    legalProvider: config.legalProvider,
    nodeEnv: config.nodeEnv,
  });
});

app.use('/api', searchRoutes);
app.use('/api', sourceRoutes);
app.use('/api', explainRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Verilex backend listening on port ${config.port} (provider: ${config.legalProvider})`);
});
