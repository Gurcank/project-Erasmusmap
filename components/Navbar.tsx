"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Globe,
  Landmark,
  Loader2,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import UserAvatar from "@/components/ui/UserAvatar";
import HamburgerIcon from "@/components/ui/HamburgerIcon";
import GlassButton, { GlassLink } from "@/components/ui/GlassButton";
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

  // The map is the home page. It used to be reachable only through the
  // wordmark, which reads as "go to the start" rather than as a destination.
  const navLinks = [
    { href: "/", label: t.mapNav, icon: Globe },
    { href: "/meydan", label: t.square, icon: Landmark },
  ];

  const suggestionList = (
    <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card glass border border-border bg-surface shadow-popover">
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
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
      <div className="glass glass-edge glass-shimmer mx-auto max-w-6xl rounded-[1.75rem] bg-surface shadow-popover">
        <nav
          aria-label="Site navigasyonu"
          className="flex items-center justify-between gap-4 px-4 py-2.5 md:px-5 md:py-3"
        >
          <Link
            href="/"
            className="font-display text-xl font-bold tracking-tight text-text transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Erasmus<span className="text-accent-text">Map</span>
          </Link>

          <div className="hidden shrink-0 items-center gap-1 md:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  pathname === href
                    ? "bg-surface-raised text-text"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

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
                <GlassLink href="/login" variant="primary">
                  {t.login}
                </GlassLink>
              ) : (
                <GlassButton
                  onClick={() => setProfileOpen(!profileOpen)}
                  aria-label={t.profile}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  variant="ghost"
                  size="icon"
                  className="border-transparent p-0 hover:border-border-strong"
                >
                  <UserAvatar
                    src={session.user?.image ?? null}
                    label={session.user?.username ?? session.user?.name ?? "?"}
                    size={36}
                  />
                </GlassButton>
              )}

              {profileOpen && session && (
                <div
                  role="menu"
                  className="absolute right-0 mt-3 w-52 overflow-hidden rounded-card glass border border-border bg-surface shadow-popover"
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

            <GlassButton
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t.menu}
              aria-expanded={menuOpen}
              variant="ghost"
              size="icon"
              className="text-text md:hidden"
            >
              <HamburgerIcon open={menuOpen} />
            </GlassButton>
          </div>
        </nav>
      </div>

      {menuOpen && (
        <div className="glass glass-edge mx-auto mt-2 max-w-6xl space-y-4 rounded-panel bg-surface p-5 shadow-popover md:hidden">
          <div className="relative">
            {searchField(true)}
            {showSuggestions && suggestionList}
          </div>

          <div className="space-y-2">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`glass glass-edge flex items-center gap-2.5 rounded-full border px-4 py-3 text-text ${
                  pathname === href
                    ? "border-primary bg-surface-raised"
                    : "border-border-strong"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>

          {!session ? (
            <GlassLink href="/login" variant="primary" size="lg" fullWidth>
              {t.login}
            </GlassLink>
          ) : (
            <div className="space-y-2">
              <Link
                href={profileHref}
                className="glass glass-edge flex items-center gap-2.5 rounded-full border border-border-strong px-4 py-3 text-text"
              >
                <User size={16} aria-hidden="true" />
                {t.profile}
              </Link>
              <Link
                href="/settings"
                className="glass glass-edge flex items-center gap-2.5 rounded-full border border-border-strong px-4 py-3 text-text"
              >
                <Settings size={16} aria-hidden="true" />
                {t.settings}
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
