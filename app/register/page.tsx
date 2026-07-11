import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";

export const metadata: Metadata = {
  title: "Kayıt Ol",
};

export default function RegisterPage() {
  return <RegisterClient />;
}
