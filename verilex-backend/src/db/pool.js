import pg from 'pg';
import { config } from '../config.js';

function resolveSsl() {
  if (config.databaseSsl === 'true') return { rejectUnauthorized: false };
  if (config.databaseSsl === 'false') return false;

  // "auto" (default): Supabase (and most managed Postgres) requires TLS;
  // a local/self-hosted instance on localhost generally doesn't have a
  // cert configured at all, so only enable it for non-local hosts.
  const isLocal = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
  return isLocal ? false : { rejectUnauthorized: false };
}

if (!config.databaseUrl) {
  console.warn(
    '[db] DATABASE_URL is not set. Set it to your Supabase Postgres connection string ' +
      '(Project Settings -> Database -> Connection string) — see .env.example.'
  );
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: resolveSsl(),
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function withTransaction(fn) {
  return withClient(async (client) => {
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
