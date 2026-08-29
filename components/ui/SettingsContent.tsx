"use client";

import Link from "next/link";
import { ArrowLeft, Languages, Palette, UserX } from "lucide-react";
import { useT } from "@/hooks/useT";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSelect from "@/components/ui/LanguageSelect";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import type { FormAction } from "@/lib/action-result";

type BlockedUser = {
  id: string;
  username: string | null;
  name: string | null;
};

type Props = {
  profileUrl: string;
  blockedUsers: BlockedUser[];
  unblockUser: FormAction;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-1 text-xs font-semibold tracking-widest text-text-subtle uppercase">
      {children}
    </h2>
  );
}

export default function SettingsContent({
  profileUrl,
  blockedUsers,
  unblockUser,
}: Props) {
  const t = useT();

  return (
    <>
      <div className="mb-8">
        <Link
          href={profileUrl}
          className="mb-1 inline-flex items-center gap-1.5 text-sm text-text-subtle transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t.backToProfile}
        </Link>
        <h1 className="font-display text-display font-bold text-text">
          {t.settingsTitle}
        </h1>
        <p className="mt-1 text-sm text-text-muted">{t.settingsDesc}</p>
      </div>

      <section>
        <SectionHeading>{t.blockedUsersSection}</SectionHeading>
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          {blockedUsers.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-text-subtle">
              {t.noBlockedUsers}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {blockedUsers.map((blocked) => (
                <li
                  key={blocked.id}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {/* No avatar: a blocked user's photo stays hidden. */}
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-subtle ring-1 ring-border"
                    >
                      <UserX size={16} aria-hidden="true" />
                    </span>
                    <span className="truncate text-sm font-medium text-text">
                      {blocked.username ?? blocked.name ?? "—"}
                    </span>
                  </div>
                  <ActionForm
                    action={unblockUser}
                    errorClassName="text-xs text-danger-700 dark:text-danger-400"
                  >
                    <input
                      type="hidden"
                      name="targetUserId"
                      value={blocked.id}
                    />
                    <SubmitButton
                      pendingText={t.saving}
                      className="shrink-0 rounded-control border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-raised hover:text-text disabled:opacity-50"
                    >
                      {t.unblockUser}
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <SectionHeading>{t.appearanceSection}</SectionHeading>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-raised text-text-muted">
                <Palette size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text">{t.themeLabel}</p>
                <p className="text-xs text-text-subtle">{t.themeDesc}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface-raised text-text-muted">
                <Languages size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-text">{t.langLabel}</p>
                <p className="text-xs text-text-subtle">{t.langDesc}</p>
              </div>
            </div>
            <LanguageSelect />
          </div>
        </div>
      </section>
    </>
  );
}
