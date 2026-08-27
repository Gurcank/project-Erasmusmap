"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The blocking script in the root layout already applied the stored
    // theme; read the result rather than deciding again.
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  };

  if (!mounted) {
    return (
      <div className="h-7 w-14 animate-pulse rounded-full bg-surface-raised motion-reduce:animate-none" />
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Koyu tema"
      onClick={toggle}
      className={`relative h-7 w-14 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
        dark ? "bg-primary" : "bg-border-strong"
      }`}
    >
      <span
        className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-surface shadow-raised transition-[left] duration-200 motion-reduce:transition-none ${
          dark ? "left-7" : "left-0.5"
        }`}
      >
        {dark ? (
          <Moon size={13} className="text-text" />
        ) : (
          <Sun size={13} className="text-text" />
        )}
      </span>
    </button>
  );
}
