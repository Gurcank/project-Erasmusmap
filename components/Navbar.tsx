"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { latinize } from "@/lib/latinize";
import { useT } from "@/hooks/useT";
import type { City } from "@/types";

export default function Navbar() {
  const router = useRouter();
  const t = useT();
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [allCities, setAllCities] = useState<City[]>([]);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/cities").then((r) => r.json()).then(setAllCities).catch(() => { });
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    const q = latinize(search).toLowerCase().trim();
    const filtered = allCities.filter((c) => latinize(c.name).toLowerCase().includes(q)).slice(0, 6);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [search, allCities]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => { setProfileOpen(false); setShowSuggestions(false); }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const q = latinize(search).toLowerCase().trim();
    const match = allCities.find((c) => latinize(c.name).toLowerCase() === q)
      || allCities.find((c) => latinize(c.name).toLowerCase().startsWith(q))
      || allCities.find((c) => latinize(c.name).toLowerCase().includes(q));
    router.push(match ? `/c/${match.slug}` : `/c/${latinize(search).toLowerCase().replace(/\s+/g, "-")}`);
    setSearch(""); setShowSuggestions(false);
  };

  const handleSelect = (city: City) => {
    router.push(`/c/${city.slug}`);
    setSearch(""); setShowSuggestions(false);
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50">
      <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border-b border-neutral-200/60 dark:border-neutral-700/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-80 transition text-gray-900 dark:text-white">
            🌍 Erasmus<span className="text-neutral-500">Map</span>
          </Link>

          {/* Desktop Search */}
          <div ref={searchRef} className="hidden md:flex flex-1 mx-10 max-w-xl relative">
            <form onSubmit={handleSearch} className="w-full">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className="w-full px-5 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-400 border border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
            </form>
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl overflow-hidden z-50">
                {suggestions.map((city) => (
                  <button key={city.id} onClick={() => handleSelect(city)} className="w-full text-left px-5 py-3 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">
                    <span className="text-gray-900 dark:text-white font-medium">{latinize(city.name)}</span>
                    <span className="text-gray-400 dark:text-neutral-500 text-sm">{city.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div ref={profileRef} className="relative hidden md:block">
              {!session ? (
                <Link href="/login" className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition">
                  {t.login}
                </Link>
              ) : (
                <button onClick={() => setProfileOpen(!profileOpen)} className="w-10 h-10 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-600">
                  <span className="bg-black dark:bg-white text-white dark:text-black w-full h-full flex items-center justify-center font-semibold">
                    {session.user?.username?.charAt(0).toUpperCase() ?? session.user?.name?.charAt(0)}
                  </span>
                </button>
              )}
              {profileOpen && session && (
                <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-neutral-800 shadow-xl rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  <Link href={session?.user?.username ? `/u/${session.user.username}` : "#"} onClick={(e) => { if (!session?.user?.username) e.preventDefault(); }} className="block px-5 py-3 text-gray-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">{t.profile}</Link>
                  <Link href="/settings" className="block px-5 py-3 text-gray-800 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">{t.settings}</Link>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left px-5 py-3 text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">{t.logout}</button>
                </div>
              )}
            </div>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-2xl text-gray-900 dark:text-white hover:scale-110 transition">☰</button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-6 space-y-4">
            <div className="relative">
              <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }}>
                <input type="text" placeholder={t.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-5 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-400 border border-neutral-300 dark:border-neutral-700 focus:outline-none" />
              </form>
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl overflow-hidden z-50">
                  {suggestions.map((city) => (
                    <button key={city.id} onClick={() => { handleSelect(city); setMenuOpen(false); }} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 transition">
                      <span className="text-gray-900 dark:text-white font-medium">{latinize(city.name)}</span>
                      <span className="text-gray-400 text-sm">{city.country}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!session ? (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-center px-5 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-medium">{t.login}</Link>
            ) : (
              <Link href={session.user?.username ? `/u/${session.user.username}` : "#"} onClick={() => setMenuOpen(false)} className="block text-center px-5 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-medium">{t.profile}</Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
