/**
 * Server actions return this instead of throwing. Next.js redacts thrown error
 * messages in production, so a thrown validation message never reaches the user
 * — it surfaces as the generic error boundary instead.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const actionSuccess: ActionResult = { ok: true };

export function actionError(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * An error whose message was written for the person using the form: a failed
 * validation, a missing permission, a rate limit. It is the only kind of error
 * whose text leaves the server. Anything else — a database failure, a bug —
 * can carry table names or query text, so it is logged and replaced by
 * GENERIC_ERROR_MESSAGE instead.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

export const GENERIC_ERROR_MESSAGE = "Bir hata oluştu";

/**
 * Next.js implements redirect() and notFound() by throwing tagged errors.
 * Swallowing those would break navigation, so they are re-thrown untouched.
 */
function isControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

/**
 * Runs an action body, converting the UserFacingErrors thrown by validation
 * helpers into a result the form can render. Every other error is logged and
 * answered with a generic message.
 */
export async function toActionResult(
  run: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await run();
    return actionSuccess;
  } catch (error) {
    if (isControlFlowError(error)) throw error;
    if (error instanceof UserFacingError) return actionError(error.message);
    console.error("Server action failed", error);
    return actionError(GENERIC_ERROR_MESSAGE);
  }
}

/** Signature every form action shares, matching React's useActionState. */
export type FormAction = (
  previousState: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;
