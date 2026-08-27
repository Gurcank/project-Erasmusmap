import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";

export default function NotFound() {
  return (
    <AuthShell
      title="Sayfa bulunamadı"
      description="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
    >
      <Link
        href="/"
        className="flex items-center justify-center gap-2 rounded-control bg-primary py-3 font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Haritaya dön
      </Link>
    </AuthShell>
  );
}
