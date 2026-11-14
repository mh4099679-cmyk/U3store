"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Language } from "@/lib/i18n/dictionaries";
import { ThemeMode } from "@/lib/auth/session";

export function ThemeSwitcher({
  scope = "storefront",
  lang = "en",
  initialTheme = "light",
}: {
  scope?: "storefront" | "admin";
  lang?: Language;
  initialTheme?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialTheme === "dark" ? "dark" : "light");

  const applyThemeDom = (targetMode: ThemeMode) => {
    if (typeof window === "undefined") return;
    const isDark =
      targetMode === "dark" ||
      (targetMode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    const cookieName = scope === "admin" ? "u3_admin_theme=" : "u3_theme=";
    const match = document.cookie.split("; ").find((row) => row.startsWith(cookieName));
    if (match) {
      const saved = decodeURIComponent(match.split("=")[1]) as ThemeMode;
      if (saved === "dark") {
        setMode("dark");
        applyThemeDom("dark");
        return;
      }
      if (saved === "light" || saved === "system") {
        setMode("light");
        applyThemeDom("light");
        return;
      }
    }
    applyThemeDom(initialTheme);
  }, [scope, initialTheme]);

  const handleSelect = async (nextMode: "light" | "dark") => {
    setMode(nextMode);
    applyThemeDom(nextMode);
    try {
      await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: nextMode, scope }),
      });
    } catch {
      // Ignore network error, local DOM already updated
    }
  };

  return (
    <div
      className="inline-flex items-center border border-[#44474C] bg-[#1A1C1F] rounded-sm p-0.5 text-[10px] font-bold tracking-wider uppercase"
      title={lang === "ar" ? "تبديل المظهر (فاتح / داكن)" : "Switch Theme (Light / Dark)"}
    >
      <button
        type="button"
        onClick={() => handleSelect("light")}
        className={`flex items-center gap-1 px-2.5 py-1 transition-all rounded-sm ${
          mode === "light"
            ? "bg-white text-[#111214] shadow-sm"
            : "text-[#BFC2C6] hover:text-white"
        }`}
      >
        <Sun className="w-3 h-3" />
        <span>{lang === "ar" ? "فاتح" : "Light"}</span>
      </button>
      <button
        type="button"
        onClick={() => handleSelect("dark")}
        className={`flex items-center gap-1 px-2.5 py-1 transition-all rounded-sm ${
          mode === "dark"
            ? "bg-[#292B2E] text-white border border-white/25 shadow-sm"
            : "text-[#BFC2C6] hover:text-white"
        }`}
      >
        <Moon className="w-3 h-3" />
        <span>{lang === "ar" ? "داكن" : "Dark"}</span>
      </button>
    </div>
  );
}
