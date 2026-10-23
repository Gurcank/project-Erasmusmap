import { ArrowLeft } from "lucide-react";
import AuthShell from "@/components/ui/AuthShell";
import { GlassLink } from "@/components/ui/GlassButton";
import { getTranslations } from "@/lib/i18n";
import { getRequestLang } from "@/lib/lang-server";

export default async function NotFound() {
  const t = getTranslations(await getRequestLang());
  return (
    <AuthShell title={t.notFoundTitle} description={t.notFoundDescription}>
      <GlassLink href="/" variant="primary" size="lg" fullWidth>
        <ArrowLeft size={16} aria-hidden="true" />
        {t.backToMap}
      </GlassLink>
    </AuthShell>
  );
}
