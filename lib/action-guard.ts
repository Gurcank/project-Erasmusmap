import { UserFacingError } from "@/lib/action-result";
import {
  requireActiveUser,
  requireAdmin,
  type ActiveUser,
} from "@/lib/auth-guards";
import { rateLimit } from "@/lib/rate-limit";

export const RATE_LIMITED_MESSAGE =
  "Çok fazla istek. Lütfen biraz sonra tekrar dene.";

const DEFAULT_LIMIT_PER_MINUTE = 30;

type GuardOptions = {
  /** Requests allowed per minute and per user for this key. */
  limit?: number;
  /** Also requires the ADMIN role. */
  admin?: boolean;
};

/**
 * The gate every mutating server action goes through: the signed-in, not
 * banned user is read from the database, then counted against the rate limit
 * for `key`.
 *
 * The limit is keyed by user id, not email. The key is written to Redis, and an
 * address has no business being stored there; the id is just as unique.
 *
 * Failures are thrown as UserFacingError so toActionResult can show them.
 */
export async function authorizeAction(
  key: string,
  { limit = DEFAULT_LIMIT_PER_MINUTE, admin = false }: GuardOptions = {},
): Promise<ActiveUser> {
  const auth = admin ? await requireAdmin() : await requireActiveUser();
  if (!auth.ok) throw new UserFacingError(auth.error);

  if (!(await rateLimit(`${key}:${auth.user.id}`, limit))) {
    throw new UserFacingError(RATE_LIMITED_MESSAGE);
  }

  return auth.user;
}
