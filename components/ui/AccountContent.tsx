"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/hooks/useT";
import SubmitButton from "@/components/ui/SubmitButton";
import ActionForm from "@/components/ui/ActionForm";
import AvatarUploader from "@/components/ui/AvatarUploader";
import { MAX_BIO_LENGTH } from "@/lib/profile";
import type { FormAction } from "@/lib/action-result";

type Props = {
  name: string | null;
  bio: string | null;
  email: string;
  username: string | null;
  role: string;
  image: string | null;
  profileUrl: string;
  updateProfile: FormAction;
  updateUsername: FormAction;
};

/**
 * The "Edit Profile" surface — photo, name, bio and username in one place. It
 * is deliberately separate from Settings (blocked users, theme, language): the
 * button on the profile header opens this, the navbar's Settings link opens the
 * other.
 */
export default function AccountContent({
  name,
  bio,
  email,
  username,
  role,
  image,
  profileUrl,
  updateProfile,
  updateUsername,
}: Props) {
  const t = useT();

  const inputClass =
    "w-full rounded-control border border-border-strong bg-surface px-4 py-2.5 text-sm text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus";
  const saveButtonClass =
    "rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50";

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
          {t.accountTitle}
        </h1>
      </div>

      <div className="space-y-6 rounded-card border border-border bg-surface px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <AvatarUploader image={image} fallbackLabel={name ?? email} />
          <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-text-muted">
            {role === "ADMIN" ? t.admin : t.member}
          </span>
        </div>

        <ActionForm
          action={updateProfile}
          className="space-y-4"
          errorClassName="text-xs text-danger-700 dark:text-danger-400"
        >
          <div className="space-y-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-text">
              {t.bioLabel}
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={bio ?? ""}
              maxLength={MAX_BIO_LENGTH}
              rows={3}
              placeholder={t.noBioClick}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-text-subtle">
              {t.bioHint.replace("{max}", String(MAX_BIO_LENGTH))}
            </p>
          </div>

          <SubmitButton pendingText={t.saving} className={saveButtonClass}>
            {t.saveProfile}
          </SubmitButton>
        </ActionForm>

        <ActionForm
          action={updateUsername}
          className="space-y-3 border-t border-border pt-6"
          errorClassName="text-xs text-danger-700 dark:text-danger-400"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="username" className="text-sm font-medium text-text">
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
              className={`${inputClass} flex-1`}
            />
            <SubmitButton
              pendingText={t.updatingBtn}
              className={saveButtonClass}
            >
              {t.updateBtn}
            </SubmitButton>
          </div>
          <p className="text-xs text-text-subtle">{t.usernameHint}</p>
          <p className="truncate text-xs text-text-subtle">{email}</p>
        </ActionForm>
      </div>
    </>
  );
}
