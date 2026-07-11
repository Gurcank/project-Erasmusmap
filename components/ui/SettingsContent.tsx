"use client";

import { useT } from "@/hooks/useT";
import ThemeToggle from "@/components/ui/ThemeToggle";
import LanguageSelect from "@/components/ui/LanguageSelect";
import Link from "next/link";

type Props = {
  name: string | null;
  email: string;
  username: string | null;
  role: string;
  profileUrl: string;
  updateUsername: (formData: FormData) => Promise<void>;
};

export default function SettingsContent({ name, email, username, role, profileUrl, updateUsername }: Props) {
  const t = useT();

  return (
    <>
      {/* Başlık */}
      <div className="mb-8">
        <div className="mb-1">
          <Link href={profileUrl} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition text-sm">
            {t.backToProfile}
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.settingsTitle}</h1>
        <p className="text-gray-500 dark:text-white/40 text-sm mt-1">{t.settingsDesc}</p>
      </div>

      {/* HESAP */}
      <section>
        <p className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3 px-1">
          {t.accountSection}
        </p>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                {name?.charAt(0) ?? "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
                <p className="text-xs text-gray-400 dark:text-white/40">{email}</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
              {role === "ADMIN" ? t.admin : t.member}
            </span>
          </div>

          <div className="px-6 py-5">
            <form action={updateUsername} className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-white">{t.usernameLabel}</label>
                <span className="text-xs text-gray-400 dark:text-white/30">
                  erasmusmap.com/u/<span className="text-indigo-500">{username ?? "…"}</span>
                </span>
              </div>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 text-sm select-none">@</span>
                  <input
                    name="username"
                    defaultValue={username ?? ""}
                    maxLength={20}
                    placeholder="username"
                    className="w-full pl-7 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-white text-sm rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition placeholder-gray-300 dark:placeholder-white/20"
                  />
                </div>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all">
                  {t.updateBtn}
                </button>
              </div>
              <p className="text-xs text-gray-400 dark:text-white/30">{t.usernameHint}</p>
            </form>
          </div>
        </div>
      </section>

      {/* GÖRÜNÜM */}
      <section>
        <p className="text-xs font-semibold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3 px-1">
          {t.appearanceSection}
        </p>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">

          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-lg">🎨</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.themeLabel}</p>
                <p className="text-xs text-gray-400 dark:text-white/40">{t.themeDesc}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-lg">🌐</div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.langLabel}</p>
                <p className="text-xs text-gray-400 dark:text-white/40">{t.langDesc}</p>
              </div>
            </div>
            <LanguageSelect />
          </div>

        </div>
      </section>
    </>
  );
}
