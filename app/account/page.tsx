import { localizedMetadata } from "@/lib/page-meta";
import { redirect } from "next/navigation";
import AccountContent from "@/components/ui/AccountContent";
import { requireActiveUser } from "@/lib/auth-guards";
import { updateProfile, updateUsername } from "@/lib/profile-actions";
import { getAccountUser } from "@/lib/queries/profile";

export const generateMetadata = () =>
  localizedMetadata((t) => ({
    title: t.accountTitle,
    robots: { index: false, follow: false },
  }));

export default async function AccountPage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/");

  const user = await getAccountUser(viewer.user.id);
  if (!user) redirect("/");

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-2xl space-y-6 px-6 pt-28 pb-24">
        <AccountContent
          name={user.name}
          bio={user.bio}
          email={user.email ?? ""}
          username={user.username}
          role={user.role}
          avatar={user.avatar}
          userId={user.id}
          profileUrl={user.username ? `/u/${user.username}` : "/"}
          updateProfile={updateProfile}
          updateUsername={updateUsername}
        />
      </div>
    </div>
  );
}
