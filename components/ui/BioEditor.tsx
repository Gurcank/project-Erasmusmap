"use client";

import { useState, useTransition } from "react";
import { useT } from "@/hooks/useT";

const MAX_CHARS = 160;

export default function BioEditor({
  initialBio,
  updateBio,
}: {
  initialBio: string;
  updateBio: (formData: FormData) => Promise<void>;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [draft, setDraft] = useState(initialBio);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const remaining = MAX_CHARS - draft.length;

  const handleSave = () => {
    const formData = new FormData();
    formData.set("bio", draft);
    startTransition(async () => {
      await updateBio(formData);
      setBio(draft);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleCancel = () => { setDraft(bio); setEditing(false); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 dark:text-white font-semibold text-sm uppercase tracking-wider">Bio</h3>
        {!editing && (
          <button onClick={() => { setEditing(true); setSaved(false); }} className="text-xs text-indigo-500 hover:text-indigo-400 transition flex items-center gap-1">
            ✏️ {t.editBio}
          </button>
        )}
        {saved && <span className="text-xs text-emerald-500 font-medium animate-pulse">{t.savedSuccess}</span>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="relative">
            <textarea
              value={draft}
              onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setDraft(e.target.value); }}
              placeholder={t.noBioClick}
              rows={4}
              autoFocus
              className="w-full bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white text-sm p-4 pb-8 rounded-xl border-2 border-indigo-400 dark:border-indigo-500 focus:outline-none resize-none transition placeholder-gray-400 dark:placeholder-white/30"
            />
            <span className={`absolute bottom-3 right-3 text-xs font-mono transition-colors ${remaining < 20 ? remaining < 5 ? "text-red-500" : "text-amber-500" : "text-gray-400 dark:text-white/30"}`}>
              {remaining}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isPending || draft === bio}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white">
              {isPending ? t.saving : t.saveBio}
            </button>
            <button onClick={handleCancel} className="px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-white/20">
              {t.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} className="group cursor-pointer relative bg-gray-100 dark:bg-white/10 rounded-xl p-4 border border-transparent hover:border-indigo-400/50 transition-all">
          <p className="text-gray-700 dark:text-white/70 text-sm leading-relaxed">
            {bio || <span className="text-gray-400 dark:text-white/30 italic">{t.noBioClick}</span>}
          </p>
          <span className="absolute bottom-2 right-3 text-xs text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">{t.editHint}</span>
        </div>
      )}
    </div>
  );
}
