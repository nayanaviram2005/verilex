import { pool } from '../db/pool.js';

/**
 * Creates or updates a user from a verified OAuth identity. Only the
 * minimum profile fields are stored — no provider access/refresh tokens.
 * Matching is by (oauth_provider, oauth_provider_user_id), falling back to
 * linking an existing row by email if one exists without an OAuth identity
 * yet (e.g. seeded manually), so a person never ends up with duplicate
 * accounts across providers that share an email.
 */
export async function upsertOAuthUser({ provider, providerUserId, email, name, profileImageUrl }) {
  const { rows: byIdentity } = await pool.query(
    `SELECT * FROM users WHERE oauth_provider = $1 AND oauth_provider_user_id = $2`,
    [provider, providerUserId]
  );

  if (byIdentity[0]) {
    const { rows } = await pool.query(
      `UPDATE users SET name = $1, profile_image_url = $2, email = COALESCE($3, email), last_login_at = now()
       WHERE id = $4 RETURNING *`,
      [name || byIdentity[0].name, profileImageUrl || byIdentity[0].profile_image_url, email, byIdentity[0].id]
    );
    return rows[0];
  }

  if (email) {
    const { rows: byEmail } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
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
    [email || null, name || null, profileImageUrl || null, provider, providerUserId]
  );
  return rows[0];
}

export async function getUserById(id) {
  const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
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
