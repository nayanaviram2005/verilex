import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config.js';
import { upsertOAuthUser, getUserById } from '../services/userService.js';

/**
 * OAuth identity is verified entirely server-side via the established
 * passport-google-oauth20 strategy (standard OIDC/OAuth2 code exchange).
 * The frontend never sees, and cannot influence, the verified profile —
 * it only receives the resulting session cookie. Adding another provider
 * later means registering another passport Strategy here and a matching
 * /api/auth/<provider> route pair; no other code needs to change.
 */
export function configurePassport() {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await getUserById(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
          callbackURL: config.oauth.google.callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || null;
            const profileImageUrl = profile.photos?.[0]?.value || null;
            const user = await upsertOAuthUser({
              provider: 'google',
              providerUserId: profile.id,
              email,
              name: profile.displayName || null,
              profileImageUrl,
            });
            done(null, user);
          } catch (err) {
            done(err);
          }
        }
      )
    );
  } else {
    console.warn(
      '[auth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set — Google sign-in is disabled until configured.'
    );
  }

  return passport;
}

export function isGoogleOAuthConfigured() {
  return Boolean(config.oauth.google.clientId && config.oauth.google.clientSecret);
}
