import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Language, ThemeMode } from "./types";

const LS = {
  theme: "sh.theme",
  timezone: "sh.timezone",
  language: "sh.language",
} as const;

const dirFor = (language: Language): "ltr" | "rtl" =>
  language === "ar" ? "rtl" : "ltr";

interface PreferencesValue {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
  timezone: string;
  setTimezone: (tz: string) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  dir: "ltr" | "rtl";
  mounted: boolean;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [timezone, setTimezoneState] = useState<string>("Asia/Dubai");
  const [language, setLanguageState] = useState<Language>("en");
  const [systemDark, setSystemDark] = useState(false);

  // -- Hydration (after mount only) to eliminate SSR/client mismatches --------
  useEffect(() => {
    setThemeState(read<ThemeMode>(LS.theme, "system"));
    setTimezoneState(read<string>(LS.timezone, "Asia/Dubai"));
    setLanguageState(read<Language>(LS.language, "en"));
    setMounted(true);
  }, []);

  // -- System color-scheme listener ------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // -- Apply side effects -----------------------------------------------------
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const dir = dirFor(language);
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  // -- Persistence ------------------------------------------------------------
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS.theme, theme);
  }, [theme, mounted]);
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS.timezone, timezone);
  }, [timezone, mounted]);
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(LS.language, language);
  }, [language, mounted]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const setTimezone = useCallback((tz: string) => setTimezoneState(tz), []);
  const setLanguage = useCallback((l: Language) => setLanguageState(l), []);

  const value = useMemo<PreferencesValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      timezone,
      setTimezone,
      language,
      setLanguage,
      dir,
      mounted,
    }),
    [theme, setTheme, resolvedTheme, timezone, setTimezone, language, setLanguage, dir, mounted],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}