"use client";

import { Languages, Palette, UserX } from "lucide-react";
import { useT } from "@/hooks/useT";
import ThemeSelect from "@/components/ui/ThemeSelect";
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
  blockedUsers: BlockedUser[];
  unblockUser: FormAction;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-1 text-xs font-semibold tracking-widest text-on-backdrop-muted uppercase">
      {children}
    </h2>
  );
}

export default function SettingsContent({ blockedUsers, unblockUser }: Props) {
  const t = useT();

  return (
    <>
      <h1 className="mb-8 font-display text-display font-bold text-on-backdrop">
        {t.settingsTitle}
      </h1>

      <section>
        <SectionHeading>{t.blockedUsersSection}</SectionHeading>
        <div className="overflow-hidden rounded-card glass border border-border bg-surface">
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
                      size="sm"
                      className="shrink-0"
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
        <div className="divide-y divide-border overflow-hidden rounded-card glass border border-border bg-surface">
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
            <ThemeSelect />
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
