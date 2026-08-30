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
 * The "Edit Profile" surface — photo, username and bio in one place. It
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

  const inputClass = "field w-full px-4 py-2.5 text-sm";

  return (
    <>
      <div className="mb-8">
        <Link
          href={profileUrl}
          className="mb-1 inline-flex items-center gap-1.5 text-sm text-on-backdrop-muted transition-colors hover:text-on-backdrop focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          {t.backToProfile}
        </Link>
        <h1 className="font-display text-display font-bold text-on-backdrop">
          {t.accountTitle}
        </h1>
      </div>

      <div className="space-y-6 rounded-card glass border border-border bg-surface px-6 py-6">
        {/* Identity row: the photo, who this account is, and what it can do.
            Stacks on narrow screens so the email never squeezes the uploader. */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <AvatarUploader image={image} fallbackLabel={name ?? email} />
          <div className="flex min-w-0 flex-col gap-1.5 sm:items-end">
            <span className="w-fit rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-text-muted">
              {role === "ADMIN" ? t.admin : t.member}
            </span>
            <span className="max-w-full truncate text-xs text-text-subtle">
              {email}
            </span>
          </div>
        </div>

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
            <SubmitButton pendingText={t.updatingBtn} variant="primary">
              {t.updateBtn}
            </SubmitButton>
          </div>
          <p className="text-xs text-text-subtle">{t.usernameHint}</p>
        </ActionForm>

        <ActionForm
          action={updateProfile}
          className="space-y-4 border-t border-border pt-6"
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
              placeholder={t.bioPlaceholder}
              className={`${inputClass} resize-none`}
            />
            <p className="text-xs text-text-subtle">
              {t.bioHint.replace("{max}", String(MAX_BIO_LENGTH))}
            </p>
          </div>

          <SubmitButton pendingText={t.saving} variant="primary">
            {t.saveProfile}
          </SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
