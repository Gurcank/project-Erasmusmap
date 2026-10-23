"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  Globe,
  Landmark,
  Route,
  Loader2,
  LogOut,
  Search,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useT } from "@/hooks/useT";
import { useTripT } from "@/hooks/useTripT";
import { MIN_QUERY_LENGTH, useCitySearch } from "@/hooks/useCitySearch";
import { CITY_SEARCH_FOCUS_EVENT } from "@/lib/city-search";
import UserAvatar from "@/components/ui/UserAvatar";
import HamburgerIcon from "@/components/ui/HamburgerIcon";
import GlassButton, { GlassLink } from "@/components/ui/GlassButton";
import type { CitySuggestion } from "@/types";

// The mobile menu is two quiet lists rather than a stack of buttons: where to go,
// then what concerns the account. A row is at least 48px tall, the touch target
// that is comfortable with a thumb.
const MOBILE_GROUP =
  "divide-y divide-border overflow-hidden rounded-card border border-border";
const MOBILE_ROW =
  "flex min-h-12 items-center px-4 text-[0.95rem] transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus";

export default function Navbar() {
  const router = useRouter();
  const t = useT();
  const { tt } = useTripT();
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // Closed by clicking away, Escape or navigating; reopened by typing or focus.
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const { results: suggestions, isSearching } = useCitySearch(search);
  const showSuggestions =
    !suggestionsDismissed && search.trim().length >= MIN_QUERY_LENGTH;
  const { data: session } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (session?.user?.banned) signOut({ callbackUrl: "/" });
  }, [session]);

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
        setSuggestionsDismissed(true);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Escape closes whichever overlay is open — neither had a keyboard exit.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      setSuggestionsDismissed(true);
      setMenuOpen(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Everything that floated over the old page closes with it. Compared during
  // render rather than in an effect, so there is no frame of the new page with
  // the old page's menu still open.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setProfileOpen(false);
    setSuggestionsDismissed(true);
    setMenuOpen(false);
  }

  // Something else on the page (the map) asks for the city search. On a narrow
  // screen it lives inside the menu, so that opens first.
  useEffect(() => {
    function focusSearch() {
      const isNarrow = !window.matchMedia("(min-width: 768px)").matches;
      if (isNarrow) setMenuOpen(true);
      // The menu's field only exists once the menu has rendered.
      setTimeout(
        () => {
          const inputs = document.querySelectorAll<HTMLInputElement>(
            'header input[type="search"]',
          );
          Array.from(inputs)
            .find((input) => input.offsetParent !== null)
            ?.focus();
        },
        isNarrow ? 50 : 0,
      );
    }
    window.addEventListener(CITY_SEARCH_FOCUS_EVENT, focusSearch);
    return () =>
      window.removeEventListener(CITY_SEARCH_FOCUS_EVENT, focusSearch);
  }, []);

  const goToCity = (city: CitySuggestion) => {
    router.push(`/c/${city.slug}`);
    setSearch("");
    setSuggestionsDismissed(true);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    // Enter takes the top suggestion; there is no results page to fall back to.
    if (suggestions[0]) goToCity(suggestions[0]);
  };

  const profileHref = session?.user?.username
    ? `/u/${session.user.username}`
    : "/account";

  // The map is the home page. It used to be reachable only through the
  // wordmark, which reads as "go to the start" rather than as a destination.
  const navLinks = [
    { href: "/", label: t.mapNav, icon: Globe },
    { href: "/meydan", label: t.square, icon: Landmark },
    // Planning needs an account, so the link only shows when signed in.
    ...(session ? [{ href: "/trips", label: tt.myTrips, icon: Route }] : []),
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
        onChange={(event) => {
          setSearch(event.target.value);
          setSuggestionsDismissed(false);
        }}
        onFocus={() => setSuggestionsDismissed(false)}
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
          aria-label={t.siteNavLabel}
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
                    avatar={session.user?.avatar ?? null}
                    seed={session.user?.id ?? ""}
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

            {!session && (
              <GlassLink
                href="/login"
                variant="primary"
                size="sm"
                className="md:hidden"
              >
                {t.login}
              </GlassLink>
            )}

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
        <div className="glass glass-edge mx-auto mt-2 max-w-6xl space-y-3 rounded-panel bg-surface p-4 shadow-popover md:hidden">
          {session && (
            <Link
              href={profileHref}
              className={`${MOBILE_ROW} gap-3 rounded-card border border-border py-2`}
            >
              <UserAvatar
                avatar={session.user?.avatar ?? null}
                seed={session.user?.id ?? ""}
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-text">
                  {session.user?.username ?? session.user?.name ?? t.profile}
                </span>
                <span className="block text-xs text-text-subtle">
                  {t.profile}
                </span>
              </span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="shrink-0 text-text-subtle"
              />
            </Link>
          )}

          <div className="relative">
            {searchField(true)}
            {showSuggestions && suggestionList}
          </div>

          <ul className={MOBILE_GROUP}>
            {navLinks.map(({ href, label, icon: Icon }) => {
              const current = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={`${MOBILE_ROW} gap-3 ${
                      current
                        ? "bg-surface-raised font-medium text-text"
                        : "text-text-muted"
                    }`}
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                      className={current ? "text-accent-text" : undefined}
                    />
                    <span className="flex-1">{label}</span>
                    {current && (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {session && (
            <ul className={MOBILE_GROUP}>
              <li>
                <Link
                  href="/settings"
                  className={`${MOBILE_ROW} gap-3 text-text-muted`}
                >
                  <Settings size={18} aria-hidden="true" />
                  {t.settings}
                </Link>
              </li>
              {session.user?.role === "ADMIN" && (
                <li>
                  <Link
                    href="/admin"
                    className={`${MOBILE_ROW} gap-3 text-accent-text`}
                  >
                    <Shield size={18} aria-hidden="true" />
                    {t.adminPanel}
                  </Link>
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className={`${MOBILE_ROW} w-full cursor-pointer gap-3 text-left text-danger-700 dark:text-danger-400`}
                >
                  <LogOut size={18} aria-hidden="true" />
                  {t.logout}
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </header>
  );
}
