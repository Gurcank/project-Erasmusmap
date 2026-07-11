import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Giriş Yap",
};

export default function LoginPage() {
  return <LoginClient />;
}
