"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import UserAvatar from "@/components/ui/UserAvatar";
import type { CitySuggestion } from "@/types";

const MIN_QUERY_LENGTH = 2;
// Long enough that typing a city name is one request, short enough to feel
// immediate.
const SEARCH_DEBOUNCE_MS = 220;

export default function Navbar() {
  const router = useRouter();
  const t = useT();
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (session?.user?.banned) signOut({ callbackUrl: "/" });
  }, [session]);

  // The city list is ~1600 entries with translated aliases, so matching happens
  // on the server rather than shipping it all to every visitor.
  useEffect(() => {
    const query = search.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/cities/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("search failed");
        setSuggestions(await response.json());
        setShowSuggestions(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search]);

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

  const goToCity = (city: CitySuggestion) => {
    router.push(`/c/${city.slug}`);
    setSearch("");
    setShowSuggestions(false);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // Enter takes the top suggestion; there is no results page to fall back to.
    if (suggestions[0]) goToCity(suggestions[0]);
  };

  const profileHref = session?.user?.username
    ? `/u/${session.user.username}`
    : "/choose-username";

  const suggestionList = (
    <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-popover">
      {suggestions.length === 0 ? (
        <p className="px-5 py-3 text-sm text-text-subtle">
          {isSearching ? t.searching : t.noResults}
        </p>
      ) : (
        suggestions.map((city) => (
          <button
            key={city.id}
            type="button"
            onClick={() => goToCity(city)}
            className="flex w-full cursor-pointer items-center justify-between px-5 py-3 text-left transition-colors hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-none"
          >
            <span className="font-medium text-text">{city.name}</span>
            <span className="text-sm text-text-subtle">{city.country}</span>
          </button>
        ))
      )}
    </div>
  );

  const searchField = (mobile = false) => (
    <form onSubmit={handleSearch}>
      {isSearching ? (
        <Loader2
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 animate-spin text-text-subtle motion-reduce:animate-none"
        />
      ) : (
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle"
        />
      )}
      <input
        type="search"
        aria-label={t.searchPlaceholder}
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        className={`w-full border border-border-strong bg-surface pr-4 pl-10 text-text transition-colors placeholder:text-text-subtle focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ${
          mobile ? "rounded-control py-3" : "rounded-full py-2.5 text-sm"
        }`}
      />
    </form>
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
            {searchField()}
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
              {searchField(true)}
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
