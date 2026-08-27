import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ChooseUsernameClient from "./ChooseUsernameClient";
import { requireActiveUser } from "@/lib/auth-guards";

export const metadata: Metadata = {
  title: "Kullanıcı Adı Seç",
  robots: { index: false, follow: false },
};

export default async function ChooseUsernamePage() {
  const viewer = await requireActiveUser();
  if (!viewer.ok) redirect("/login");
  if (viewer.user.username) redirect(`/u/${viewer.user.username}`);

  return <ChooseUsernameClient />;
}
