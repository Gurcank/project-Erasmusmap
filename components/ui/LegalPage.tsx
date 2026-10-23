"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { useT } from "@/hooks/useT";
import { getLegalDocument, type LegalKind } from "@/lib/legal";

/**
 * A legal text in the reader's language. The text sits on one glass panel like
 * the other settings-style pages; the heading stays on the backdrop.
 */
export default function LegalPage({ kind }: { kind: LegalKind }) {
  const t = useT();
  const doc = getLegalDocument(kind, useLang());

  return (
    <div className="min-h-screen pt-28 pb-24">
      <div className="mx-auto max-w-3xl px-6">
        <Link
          href="/"
          className="mb-1 inline-flex items-center gap-1.5 text-sm text-on-backdrop-muted transition-colors hover:text-on-backdrop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t.backToMap}
        </Link>
        <h1 className="font-display text-display font-bold text-on-backdrop">
          {doc.title}
        </h1>
        <p className="mt-1 mb-8 text-sm text-on-backdrop-muted">
          {doc.updated}
        </p>

        <article className="space-y-8 rounded-card glass border border-border bg-surface px-6 py-8 text-sm leading-relaxed text-text sm:px-8">
          {doc.intro && <p className="text-text-muted">{doc.intro}</p>}

          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-display text-base font-semibold text-text">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-text-muted">
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="list-disc space-y-2 pl-5 text-text-muted marker:text-text-subtle">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.after?.map((paragraph) => (
                <p key={paragraph} className="text-text-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
