import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import MapBackground from "@/components/map/Map";
import SettingsContent from "@/components/ui/SettingsContent";
import { requireActiveUser } from "@/lib/auth-guards";
import { toggleBlock } from "@/lib/social-actions";

export const metadata: Metadata = {
  title: "Ayarlar",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/");

  const [user, blocks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: viewer.user.id },
      select: { username: true },
    }),
    prisma.block.findMany({
      where: { blockerId: viewer.user.id },
      orderBy: { createdAt: "desc" },
      // No image: a blocked user's avatar stays hidden even in this list.
      select: {
        blocked: { select: { id: true, username: true, name: true } },
      },
    }),
  ]);
  if (!user) redirect("/");

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10">
        <MapBackground isStatic />
      </div>
      <div className="relative z-10 min-h-screen bg-canvas/90 pt-28 pb-24 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl space-y-6 px-6">
          <SettingsContent
            profileUrl={user.username ? `/u/${user.username}` : "/"}
            blockedUsers={blocks.map((block) => block.blocked)}
            unblockUser={toggleBlock}
          />
        </div>
      </div>
    </div>
  );
}
