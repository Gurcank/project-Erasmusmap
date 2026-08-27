"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { useT } from "@/hooks/useT";
import { MAX_BIO_LENGTH as MAX_CHARS } from "@/lib/profile";
import type { FormAction } from "@/lib/action-result";

export default function BioEditor({
  initialBio,
  updateBio,
}: {
  initialBio: string;
  updateBio: FormAction;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [draft, setDraft] = useState(initialBio);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const remaining = MAX_CHARS - draft.length;
  const headingId = useId();
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(savedTimeoutRef.current);
  }, []);

  const handleSave = () => {
    const formData = new FormData();
    formData.set("bio", draft);
    startTransition(async () => {
      const result = await updateBio(null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setError("");
      setBio(draft);
      setEditing(false);
      setSaved(true);
      savedTimeoutRef.current = setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleCancel = () => {
    setDraft(bio);
    setEditing(false);
    setError("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2
          id={headingId}
          className="text-xs font-semibold tracking-widest text-text-subtle uppercase"
        >
          Bio
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setSaved(false);
            }}
            className="flex cursor-pointer items-center gap-1 text-xs text-accent-text transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Pencil size={12} aria-hidden="true" />
            {t.editBio}
          </button>
        )}
        {saved && (
          <span className="text-xs font-medium text-visited-700 dark:text-visited-400">
            {t.savedSuccess}
          </span>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              aria-labelledby={headingId}
              value={draft}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CHARS)
                  setDraft(e.target.value);
              }}
              placeholder={t.noBioClick}
              rows={4}
              autoFocus
              className="w-full resize-none rounded-card border border-border-strong bg-surface p-4 pb-8 text-sm text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
            />
            <span
              className={`absolute right-3 bottom-3 font-mono text-xs transition-colors ${
                remaining < 20
                  ? remaining < 5
                    ? "text-danger-700 dark:text-danger-400"
                    : "text-accent-text"
                  : "text-text-subtle"
              }`}
            >
              {remaining}
            </span>
          </div>
          {error && (
            <p className="text-xs text-danger-700 dark:text-danger-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || draft === bio}
              className="flex-1 cursor-pointer rounded-control bg-primary py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? t.saving : t.saveBio}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="cursor-pointer rounded-control border border-border-strong px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={t.editBio}
          className="group relative w-full cursor-pointer rounded-card border border-transparent bg-surface-raised p-4 text-left transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <p className="text-sm leading-relaxed text-text-muted">
            {bio || (
              <span className="text-text-subtle italic">{t.noBioClick}</span>
            )}
          </p>
          <span className="absolute right-3 bottom-2 text-xs text-accent-text opacity-0 transition-opacity group-hover:opacity-100">
            {t.editHint}
          </span>
        </button>
      )}
    </div>
  );
}
