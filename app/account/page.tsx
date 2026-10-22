import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import AccountContent from "@/components/ui/AccountContent";
import { bioSchema, firstIssueMessage, usernameSchema } from "@/lib/schemas";
import { authorizeAction } from "@/lib/action-guard";
import { setUsername } from "@/lib/user";
import { requireActiveUser } from "@/lib/auth-guards";
import { UserFacingError, toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

export const metadata: Metadata = {
  title: "Hesap",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/");

  const user = await prisma.user.findUnique({ where: { id: viewer.user.id } });
  if (!user) redirect("/");

  async function updateProfile(
    _previousState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    "use server";
    return toActionResult(async () => {
      const user = await authorizeAction("profile", { limit: 10 });

      const bio = bioSchema.safeParse(formData.get("bio") ?? "");
      if (!bio.success) throw new UserFacingError(firstIssueMessage(bio.error));

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { bio: bio.data },
      });
      if (updated.username) revalidatePath(`/u/${updated.username}`);
      revalidatePath("/account");
    });
  }

  async function updateUsername(
    _previousState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    "use server";
    return toActionResult(async () => {
      const user = await authorizeAction("username", { limit: 10 });

      const parsed = usernameSchema.safeParse(formData.get("username") ?? "");
      if (!parsed.success)
        throw new UserFacingError(firstIssueMessage(parsed.error));
      const username = parsed.data;

      if ((await setUsername(user.id, username)) === "taken")
        throw new UserFacingError("Bu kullanıcı adı zaten alınmış");
      revalidatePath(`/u/${username}`);
      revalidatePath("/account");
      redirect(`/u/${username}`);
    });
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl space-y-6 px-6 pt-28 pb-24">
        <AccountContent
          name={user.name}
          bio={user.bio}
          email={user.email ?? ""}
          username={user.username}
          role={user.role}
          image={user.image}
          profileUrl={user.username ? `/u/${user.username}` : "/"}
          updateProfile={updateProfile}
          updateUsername={updateUsername}
        />
      </div>
    </div>
  );
}
