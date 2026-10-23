import { localizedMetadata } from "@/lib/page-meta";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsContent from "@/components/ui/SettingsContent";
import { requireActiveUser } from "@/lib/auth-guards";
import { toggleBlock } from "@/lib/social-actions";

export const generateMetadata = () =>
  localizedMetadata((t) => ({
    title: t.settings,
    robots: { index: false, follow: false },
  }));

export default async function SettingsPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/");

  const blocks = await prisma.block.findMany({
    where: { blockerId: viewer.user.id },
    orderBy: { createdAt: "desc" },
    // No image: a blocked user's avatar stays hidden even in this list.
    select: {
      blocked: { select: { id: true, username: true, name: true } },
    },
  });

  return (
    <div className="min-h-screen pt-28 pb-24">
      <div className="mx-auto max-w-2xl space-y-6 px-6">
        <SettingsContent
          blockedUsers={blocks.map((block) => block.blocked)}
          unblockUser={toggleBlock}
          confirmWord={viewer.user.username ?? viewer.user.email}
        />
      </div>
    </div>
  );
}
