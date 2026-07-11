import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import SettingsContent from "@/components/ui/SettingsContent";
import { getUsernameError } from "@/lib/username";
import { rateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = {
  title: "Ayarlar",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/");

  async function updateUsername(formData: FormData) {
    "use server";
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Giriş yapmalısın");
    const email = session.user.email;

    if (!rateLimit(`username:${email}`))
      throw new Error("Çok fazla istek. Lütfen biraz sonra tekrar dene.");

    const username = String(formData.get("username") ?? "")
      .toLowerCase()
      .trim();
    const validationError = getUsernameError(username);
    if (validationError) throw new Error(validationError);
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists && exists.email !== email)
      throw new Error("Bu kullanıcı adı zaten alınmış");
    await prisma.user.update({ where: { email }, data: { username } });
    revalidatePath(`/u/${username}`);
    revalidatePath("/settings");
    redirect(`/u/${username}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      <div className="max-w-2xl mx-auto pt-28 px-6 pb-24 space-y-6">
        <SettingsContent
          name={user.name}
          email={user.email ?? ""}
          username={user.username}
          role={user.role}
          profileUrl={user.username ? `/u/${user.username}` : "/"}
          updateUsername={updateUsername}
        />
      </div>
    </div>
  );
}
