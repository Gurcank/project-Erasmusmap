import { ArrowLeft } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import { GlassLink } from "@/components/ui/GlassButton";

export default function NotFound() {
  return (
    <AuthShell
      title="Sayfa bulunamadı"
      description="Aradığın sayfa taşınmış ya da hiç var olmamış olabilir."
    >
      <GlassLink href="/" variant="primary" size="lg" fullWidth>
        <ArrowLeft size={16} aria-hidden="true" />
        Haritaya dön
      </GlassLink>
    </AuthShell>
  );
}
