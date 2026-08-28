"use client";

import Link from "next/link";
import { ArrowLeft, Languages, Palette } from "lucide-react";
import { useT } from "@/hooks/useT";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSelect from "@/components/ui/LanguageSelect";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import UserAvatar from "@/components/ui/UserAvatar";
import type { FormAction } from "@/lib/action-result";

type Props = {
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  image: string | null;
  profileUrl: string;
  updateUsername: FormAction;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-1 text-xs font-semibold tracking-widest text-text-subtle uppercase">
      {children}
    </h2>
  );
}

export default function SettingsContent({
  name,
  email,
  username,
  role,
  image,
  profileUrl,
  updateUsername,
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
        <SectionHeading>{t.accountSection}</SectionHeading>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-center gap-3">
              <UserAvatar src={image} label={name ?? email} size={44} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {name}
                </p>
                <p className="truncate text-xs text-text-subtle">{email}</p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-text-muted">
              {role === "ADMIN" ? t.admin : t.member}
            </span>
          </div>

          <div className="px-6 py-5">
            <ActionForm
              action={updateUsername}
              className="space-y-3"
              errorClassName="text-xs text-danger-700 dark:text-danger-400"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="username"
                  className="text-sm font-medium text-text"
                >
                  {t.usernameLabel}
                </label>
                <span className="truncate text-xs text-text-subtle">
                  erasmusmap.com/u/
                  <span className="text-accent-text">{username ?? "…"}</span>
                </span>
              </div>
              <div className="flex gap-3">
                <input
                  id="username"
                  name="username"
                  defaultValue={username ?? ""}
                  maxLength={20}
                  placeholder="kullanici-adi"
                  className="flex-1 rounded-control border border-border-strong bg-surface px-4 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                />
                <SubmitButton
                  pendingText={t.updatingBtn}
                  className="rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {t.updateBtn}
                </SubmitButton>
              </div>
              <p className="text-xs text-text-subtle">{t.usernameHint}</p>
            </ActionForm>
          </div>
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
