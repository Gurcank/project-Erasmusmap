import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SettingsContent from "@/components/ui/SettingsContent";
import { firstIssueMessage, usernameSchema } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { requireActiveUser } from "@/lib/auth-guards";
import { toActionResult } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";

export const metadata: Metadata = {
  title: "Ayarlar",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: viewer.user.id },
  });
  if (!user) redirect("/");

  async function updateUsername(
    _previousState: ActionResult | null,
    formData: FormData,
  ): Promise<ActionResult> {
    "use server";
    return toActionResult(async () => {
      const auth = await requireActiveUser();
      if (!auth.ok) throw new Error(auth.error);

      if (!(await rateLimit(`username:${auth.user.email}`)))
        throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");

      const parsed = usernameSchema.safeParse(formData.get("username") ?? "");
      if (!parsed.success) throw new Error(firstIssueMessage(parsed.error));
      const username = parsed.data;

      const exists = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (exists && exists.id !== auth.user.id)
        throw new Error("Bu kullanıcı adı zaten alınmış");

      await prisma.user.update({
        where: { id: auth.user.id },
        data: { username },
      });
      revalidatePath(`/u/${username}`);
      revalidatePath("/settings");
      redirect(`/u/${username}`);
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-2xl mx-auto pt-28 px-6 pb-24 space-y-6">
        <SettingsContent
          name={user.name}
          email={user.email ?? ""}
          username={user.username}
          role={user.role}
          image={user.image}
          profileUrl={user.username ? `/u/${user.username}` : "/"}
          updateUsername={updateUsername}
        />
      </div>
    </div>
  );
}
