import { Router } from 'express';
import passport from 'passport';
import { config } from '../config.js';
import { isGoogleOAuthConfigured } from '../auth/passport.js';
import { toPublicUser } from '../services/userService.js';

export const router = Router();

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

router.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie('verilex.sid');
      res.json({ ok: true });
    });
  });
});
