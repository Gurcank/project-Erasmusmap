"use client";

import { useEffect, useState } from "react";

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
    const html = document.documentElement;
    if (dark) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
    setDark(!dark);
  };

  if (!mounted)
    return (
      <div className="w-14 h-7 rounded-full bg-gray-200 dark:bg-zinc-700 animate-pulse" />
    );

  return (
    <button
      onClick={toggle}
      className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
      style={{ backgroundColor: dark ? "#6366f1" : "#d1d5db" }}
      aria-label="Tema değiştir"
    >
      <span
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-sm transition-all duration-300 ${
          dark ? "left-7" : "left-0.5"
        }`}
      >
        {dark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
