"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      className="rounded-xl border border-border bg-card p-2 text-text"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="toggle-theme"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
