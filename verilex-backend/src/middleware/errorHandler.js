export function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.code === 'ECONNREFUSED' || err.message?.includes('legal source retrieval')) {
    return res.status(503).json({ error: 'Legal source retrieval is temporarily unavailable.' });
  }

  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
}
