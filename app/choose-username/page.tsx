import type { Metadata } from "next";
import ChooseUsernameClient from "./ChooseUsernameClient";

export const metadata: Metadata = {
  title: "Kullanıcı Adı Seç",
  robots: { index: false, follow: false },
};

export default function ChooseUsernamePage() {
  return <ChooseUsernameClient />;
}
