"use client";

import { useState, useTransition } from "react";
import LocalizedError from "@/components/ui/LocalizedError";
import { signOut } from "next-auth/react";
import { Download, Trash2 } from "lucide-react";
import { useT } from "@/hooks/useT";
import GlassButton, { GlassAnchor } from "@/components/ui/GlassButton";
import { deleteOwnAccount } from "@/lib/account-actions";

/**
 * Taking the data out and deleting the account: the two rights a person has
 * over what the site holds about them. Deleting needs the username typed, and
 * the server checks it again.
 */
export default function AccountDataSection({
  confirmWord,
}: {
  /** What the person types to confirm: their username. */
  confirmWord: string;
}) {
  const t = useT();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, startDeleting] = useTransition();

  const matches =
    confirmation.trim().toLowerCase() === confirmWord.toLowerCase();

  const remove = () => {
    setError("");
    startDeleting(async () => {
      const formData = new FormData();
      formData.set("confirmation", confirmation);
      const result = await deleteOwnAccount(null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // The user row is gone; this clears the session cookie that still names it.
      await signOut({ callbackUrl: "/" });
    });
  };

  return (
    <div className="divide-y divide-border overflow-hidden rounded-card glass border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-raised text-text-muted">
            <Download size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">{t.exportDataTitle}</p>
            <p className="text-xs text-text-subtle">{t.exportDataDesc}</p>
          </div>
        </div>
        <GlassAnchor
          href="/api/account/export"
          // An attachment, not a page: the browser saves it and stays here.
          download
          size="sm"
          className="shrink-0"
        >
          {t.exportDataBtn}
        </GlassAnchor>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-danger-600/12 text-danger-700 dark:text-danger-400">
            <Trash2 size={16} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">
              {t.deleteAccountTitle}
            </p>
            <p className="text-xs text-text-subtle">{t.deleteAccountDesc}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="delete-confirmation"
            className="text-xs text-text-subtle"
          >
            {t.deleteAccountConfirmLabel.replace("{name}", confirmWord)}
          </label>
          <input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            className="field w-full px-4 py-2.5 text-sm"
          />
        </div>

        <GlassButton
          onClick={remove}
          disabled={!matches || isDeleting}
          variant="danger"
          size="sm"
        >
          {isDeleting ? t.deleteAccountWorking : t.deleteAccountBtn}
        </GlassButton>

        {error && (
          <p
            role="alert"
            className="text-xs text-danger-700 dark:text-danger-400"
          >
            <LocalizedError message={error} />
          </p>
        )}
      </div>
    </div>
  );
}
