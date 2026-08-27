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
 * Runs an action body, converting the Error messages thrown by validation
 * helpers into a result the form can render.
 */
export async function toActionResult(
  run: () => Promise<void>,
): Promise<ActionResult> {
  try {
    await run();
    return actionSuccess;
  } catch (error) {
    if (isControlFlowError(error)) throw error;
    if (error instanceof Error) return actionError(error.message);
    throw error;
  }
}

/** Signature every form action shares, matching React's useActionState. */
export type FormAction = (
  previousState: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;
