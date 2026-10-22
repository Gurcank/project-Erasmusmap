-- The OAuth provider's tokens were stored on every Account row but never read:
-- sign-in only matches on (provider, providerAccountId). The id_token is a JWT
-- carrying the person's email, name and photo, and the access_token is a live
-- credential. lib/auth-adapter.ts no longer writes them; this clears the rows
-- written before that. The columns stay, always null.
UPDATE "Account"
SET "access_token" = NULL,
    "refresh_token" = NULL,
    "id_token" = NULL,
    "session_state" = NULL,
    "expires_at" = NULL,
    "token_type" = NULL,
    "scope" = NULL;
