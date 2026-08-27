"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LogOut, Menu, Search, Settings, Shield, User, X } from "lucide-react";
import { latinize } from "@/lib/latinize";
import { useT } from "@/hooks/useT";
import UserAvatar from "@/components/ui/UserAvatar";
import type { City } from "@/types";

const MAX_SUGGESTIONS = 6;

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
    if (session?.user?.banned) signOut({ callbackUrl: "/" });
  }, [session]);

  useEffect(() => {
    fetch("/api/cities")
      .then((r) => r.json())
      .then(setAllCities)
      .catch((err) => console.error("Failed to load cities", err));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const query = latinize(search).toLowerCase().trim();
    setSuggestions(
      allCities
        .filter((city) => latinize(city.name).toLowerCase().includes(query))
        .slice(0, MAX_SUGGESTIONS),
    );
    setShowSuggestions(allCities.length > 0);
  }, [search, allCities]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      )
        setProfileOpen(false);
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      )
        setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Escape closes whichever overlay is open — neither had a keyboard exit.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      setShowSuggestions(false);
      setMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setShowSuggestions(false);
    setMenuOpen(false);
  }, [pathname]);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!search.trim()) return;
    const query = latinize(search).toLowerCase().trim();
    const match =
      allCities.find((city) => latinize(city.name).toLowerCase() === query) ||
      allCities.find((city) =>
        latinize(city.name).toLowerCase().startsWith(query),
      ) ||
      allCities.find((city) =>
        latinize(city.name).toLowerCase().includes(query),
      );
    // No match means no city page exists; sending the user to a guessed slug
    // only produced a 404.
    if (!match) return;
    router.push(`/c/${match.slug}`);
    setSearch("");
    setShowSuggestions(false);
  };

  const handleSelect = (city: City) => {
    router.push(`/c/${city.slug}`);
    setSearch("");
    setShowSuggestions(false);
  };

  const profileHref = session?.user?.username
    ? `/u/${session.user.username}`
    : "/choose-username";

  const suggestionList = (
    <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-popover">
      {suggestions.length === 0 ? (
        <p className="px-5 py-3 text-sm text-text-subtle">{t.noResults}</p>
      ) : (
        suggestions.map((city) => (
          <button
            key={city.id}
            type="button"
            onClick={() => handleSelect(city)}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
          >
            <span className="font-medium text-text">{latinize(city.name)}</span>
            <span className="text-sm text-text-subtle">{city.country}</span>
          </button>
        ))
      )}
    </div>
  );

  return (
    <header className="fixed top-0 left-0 z-50 w-full">
      <div className="border-b border-border bg-canvas/85 backdrop-blur-xl">
        <nav
          aria-label="Site navigasyonu"
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5"
        >
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-text transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Erasmus<span className="text-accent-text">Map</span>
          </Link>

          <div
            ref={searchRef}
            className="relative mx-4 hidden max-w-lg flex-1 md:block"
          >
            <form onSubmit={handleSearch}>
              <Search
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle"
              />
              <input
                type="search"
                aria-label={t.searchPlaceholder}
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={() =>
                  suggestions.length > 0 && setShowSuggestions(true)
                }
                className="w-full rounded-full border border-border-strong bg-surface py-2.5 pr-4 pl-10 text-sm text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
              />
            </form>
            {showSuggestions && suggestionList}
          </div>

          <div className="flex items-center gap-2">
            <div ref={profileRef} className="relative hidden md:block">
              {!session ? (
                <Link
                  href="/login"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {t.login}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label={t.profile}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className="flex cursor-pointer rounded-full ring-2 ring-transparent transition-shadow hover:ring-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <UserAvatar
                    src={session.user?.image ?? null}
                    label={session.user?.username ?? session.user?.name ?? "?"}
                    size={36}
                  />
                </button>
              )}

              {profileOpen && session && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-52 overflow-hidden rounded-card border border-border bg-surface shadow-popover"
                >
                  <Link
                    href={profileHref}
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-text transition-colors hover:bg-surface-raised"
                  >
                    <User size={15} aria-hidden="true" />
                    {t.profile}
                  </Link>
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-text transition-colors hover:bg-surface-raised"
                  >
                    <Settings size={15} aria-hidden="true" />
                    {t.settings}
                  </Link>
                  {session.user?.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      role="menuitem"
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-accent-text transition-colors hover:bg-surface-raised"
                    >
                      <Shield size={15} aria-hidden="true" />
                      {t.adminPanel}
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full cursor-pointer items-center gap-2.5 border-t border-border px-4 py-3 text-left text-sm text-danger-700 transition-colors hover:bg-surface-raised dark:text-danger-400"
                  >
                    <LogOut size={15} aria-hidden="true" />
                    {t.logout}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t.menu}
              aria-expanded={menuOpen}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-control text-text transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
            >
              {menuOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>

        {menuOpen && (
          <div className="space-y-4 px-6 pb-6 md:hidden">
            <div className="relative">
              <form onSubmit={handleSearch}>
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle"
                />
                <input
                  type="search"
                  aria-label={t.searchPlaceholder}
                  placeholder={t.searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-control border border-border-strong bg-surface py-3 pr-4 pl-10 text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                />
              </form>
              {showSuggestions && suggestionList}
            </div>

            {!session ? (
              <Link
                href="/login"
                className="block rounded-control bg-primary px-5 py-3 text-center font-semibold text-on-primary"
              >
                {t.login}
              </Link>
            ) : (
              <div className="space-y-2">
                <Link
                  href={profileHref}
                  className="flex items-center gap-2.5 rounded-control border border-border-strong px-4 py-3 text-text"
                >
                  <User size={16} aria-hidden="true" />
                  {t.profile}
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 rounded-control border border-border-strong px-4 py-3 text-text"
                >
                  <Settings size={16} aria-hidden="true" />
                  {t.settings}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
