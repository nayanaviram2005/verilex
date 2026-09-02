import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db/pool.js';
import { config } from '../config.js';

const PgSession = connectPgSimple(session);

/**
 * The backend is authoritative for auth state: sessions live server-side
 * (PostgreSQL-backed, via connect-pg-simple against the "session" table),
 * the browser only holds an opaque, HttpOnly, signed session cookie — no
 * credential or token is ever placed in localStorage.
 */
export function buildSessionMiddleware() {
  if (!config.session.secret) {
    console.warn(
      '[auth] SESSION_SECRET is not set — using an insecure development-only secret. ' +
        'Set SESSION_SECRET in .env before deploying.'
    );
  }

  return session({
    store: new PgSession({ pool, tableName: 'session', createTableIfMissing: false }),
    name: 'verilex.sid',
    secret: config.session.secret || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.session.cookieSecure,
      sameSite: config.session.sameSite,
      maxAge: config.session.maxAgeMs,
    },
  });
}
