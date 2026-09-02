import { pool } from '../db/pool.js';

function normalizeEmail(email) {
  return email ? email.trim().toLowerCase() : null;
}

/**
 * Creates or updates a user from a verified OAuth identity. Only the
 * minimum profile fields are stored — no provider access/refresh tokens.
 * Matching is by (oauth_provider, oauth_provider_user_id), falling back to
 * linking an existing row by email if one exists without an OAuth identity
 * yet (e.g. an account created via email/password) — this is the same
 * internal user model as email/password accounts, so a person who signs up
 * one way can also use the other under one account rather than ending up
 * with duplicates.
 */
export async function upsertOAuthUser({ provider, providerUserId, email, name, profileImageUrl }) {
  const normalizedEmail = normalizeEmail(email);

  const { rows: byIdentity } = await pool.query(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_user_id = $2`,
    [provider, providerUserId]
  );

  if (byIdentity[0]) {
    const { rows } = await pool.query(
      `UPDATE users SET name = $1, profile_image_url = $2, email = COALESCE($3, email), last_login_at = now()
       WHERE id = $4 RETURNING *`,
      [name || byIdentity[0].name, profileImageUrl || byIdentity[0].profile_image_url, normalizedEmail, byIdentity[0].id]
    );
    return rows[0];
  }

  if (normalizedEmail) {
    const { rows: byEmail } = await pool.query(`SELECT * FROM users WHERE email = $1`, [normalizedEmail]);
    if (byEmail[0] && !byEmail[0].oauth_provider) {
      const { rows } = await pool.query(
        `UPDATE users SET oauth_provider = $1, oauth_provider_user_id = $2, name = $3, profile_image_url = $4, last_login_at = now()
         WHERE id = $5 RETURNING *`,
        [provider, providerUserId, name, profileImageUrl, byEmail[0].id]
      );
      return rows[0];
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO users (email, name, profile_image_url, oauth_provider, oauth_provider_user_id, last_login_at)
     VALUES ($1,$2,$3,$4,$5, now()) RETURNING *`,
    [normalizedEmail, name || null, profileImageUrl || null, provider, providerUserId]
  );
  return rows[0];
}

/**
 * Creates a new email/password account. The caller is responsible for
 * having already hashed the password (see routes/auth.js) — this function
 * never sees or stores a plaintext password.
 */
export async function createLocalUser(email, passwordHash) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, last_login_at) VALUES ($1,$2, now()) RETURNING *`,
    [normalizeEmail(email), passwordHash]
  );
  return rows[0];
}

/**
 * Sets/replaces the password hash on an existing account — used both when
 * a password-account user changes password (not yet exposed) and when a
 * user who originally signed up via OAuth adds a password fallback under
 * the same account (same internal user model, per upsertOAuthUser above).
 */
export async function setPasswordForUser(userId, passwordHash) {
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $1, last_login_at = now() WHERE id = $2 RETURNING *`,
    [passwordHash, userId]
  );
  return rows[0];
}

export async function touchLastLogin(userId) {
  await pool.query(`UPDATE users SET last_login_at = now() WHERE id = $1`, [userId]);
}

export async function getUserById(id) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [normalizeEmail(email)]);
  return rows[0] || null;
}

export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    profileImageUrl: user.profile_image_url,
    createdAt: user.created_at,
  };
}
