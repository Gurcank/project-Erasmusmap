"use server";

import { revalidatePath } from "next/cache";
import { authorizeAction } from "@/lib/action-guard";
import { deleteUserAccount } from "@/lib/account-deletion";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

/**
 * Deletes the signed-in user's own account.
 *
 * The person types their username to confirm, which is checked here and not
 * only in the form: a request that skips the form skips the confirmation too.
 * The target is always the caller; no user id is read from the request.
 */
export async function deleteOwnAccount(
  _previousState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return toActionResult(async () => {
    // Three a minute is generous for something done once.
    const user = await authorizeAction("account-delete", { limit: 3 });

    const confirmation = String(formData.get("confirmation") ?? "").trim();
    const expected = user.username ?? user.email;
    if (confirmation.toLowerCase() !== expected.toLowerCase()) {
      throw new UserFacingError("Onay metni eşleşmedi");
    }

    await deleteUserAccount(user);

    revalidatePath("/meydan");
  });
}
