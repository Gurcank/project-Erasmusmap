"use client";

import { useState } from "react";
import { useT } from "@/hooks/useT";

export default function VisitButton({ cityId, initialVisited }: { cityId: string; initialVisited: boolean }) {
  const t = useT();
  const [visited, setVisited] = useState(initialVisited);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cityId }) });
      const data = await res.json();
      if (data.added) { setAnimating(true); setTimeout(() => setAnimating(false), 700); setVisited(true); }
      if (data.removed) setVisited(false);
    } catch {
      // network error — silently ignore, state unchanged
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}
      className={`relative overflow-hidden flex items-center gap-2.5 h-11 px-5 rounded-xl border-2 font-semibold text-sm transition-all duration-300 select-none whitespace-nowrap
        ${visited ? "border-emerald-500 text-emerald-500 bg-emerald-500/10" : "border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"}
        ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className={`absolute bottom-0 left-0 h-full bg-emerald-500/15 transition-all duration-700 ease-out ${animating ? "w-full" : "w-0"}`} />
      <span className="relative text-base">{loading ? <span className="inline-block animate-spin">⏳</span> : visited ? "✅" : "📍"}</span>
      <span className="relative">{visited ? t.visited : t.addToList}</span>
      {visited && <span className="absolute left-0 top-0 h-full w-1 bg-emerald-500 rounded-l-xl" />}
    </button>
  );
}
