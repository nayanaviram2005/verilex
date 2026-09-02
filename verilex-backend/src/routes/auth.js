import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { config } from '../config.js';
import { isGoogleOAuthConfigured } from '../auth/passport.js';
import { validateBody } from '../middleware/validate.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { toPublicUser, getUserByEmail, createLocalUser, setPasswordForUser } from '../services/userService.js';

export const router = Router();

const BCRYPT_COST = 12;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Za-z]/, 'Password must include at least one letter.')
  .regex(/[0-9]/, 'Password must include at least one number.');

const signupSchema = z
  .object({
    email: z.string().trim().email('Enter a valid email address.').max(254),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Password is required.').max(128),
});

// Only a same-site relative path is ever honoured as a post-login
// destination — this prevents the OAuth flow from being used as an open
// redirect to an arbitrary external URL.
function sanitizeReturnTo(value) {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

router.get('/auth/status', (_req, res) => {
  res.json({ googleEnabled: isGoogleOAuthConfigured() });
});

router.get('/auth/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ user: toPublicUser(req.user) });
  }
  res.json({ user: null });
});

router.get('/auth/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
  }
  req.session.returnTo = sanitizeReturnTo(req.query.returnTo);
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get(
  '/auth/google/callback',
  (req, res, next) => {
    if (!isGoogleOAuthConfigured()) {
      return res.status(503).json({ error: 'Google sign-in is not configured on this server.' });
    }
    next();
  },
  passport.authenticate('google', {
    failureRedirect: `${config.clientOrigin}/login?error=oauth_failed`,
  }),
  (req, res) => {
    const returnTo = sanitizeReturnTo(req.session.returnTo);
    delete req.session.returnTo;
    res.redirect(`${config.clientOrigin}${returnTo}`);
  }
);

/**
 * Email/password sign-up — the fallback authentication path when Google is
 * unavailable, blocked or simply not the user's preference. Credential
 * handling (hashing, comparison) happens only here, server-side; the
 * frontend never validates or hashes a password itself.
 *
 * Duplicate-account handling: if the email already belongs to a
 * password-based account, sign-up is rejected (409) in favour of signing
 * in. If it belongs to an OAuth-only account (same internal user model —
 * see upsertOAuthUser), a password is attached to that existing account
 * instead of creating a second one, so the person ends up with one account
 * usable both ways.
 */
router.post('/auth/signup', authRateLimiter, validateBody(signupSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;
    const existing = await getUserByEmail(email);

    if (existing && existing.password_hash) {
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = existing ? await setPasswordForUser(existing.id, passwordHash) : await createLocalUser(email, passwordHash);

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json({ user: toPublicUser(user) });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Email/password sign-in via the passport-local strategy configured in
 * auth/passport.js. A generic "Invalid email or password" is returned for
 * both an unknown email and a wrong password, so the endpoint can't be used
 * to enumerate which emails have accounts.
 */
router.post('/auth/login', authRateLimiter, validateBody(loginSchema), (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid email or password.' });
    }
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      res.json({ user: toPublicUser(user) });
    });
  })(req, res, next);
});

router.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('verilex.sid');
      res.json({ ok: true });
    });
  });
});
