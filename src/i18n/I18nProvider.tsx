import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";
import { usePreferences } from "@/lib/preferences";
import type { Language } from "@/lib/types";

const DICTIONARIES: Record<Language, Record<string, unknown>> = { en, ar };

interface I18nValue {
  t: (key: string) => string;
  language: Language;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nValue>({
  t: (key) => key,
  language: "en",
  dir: "ltr",
});

function lookup(dict: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[p];
    else return undefined;
  }
  return typeof cur === "string" ? cur : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { language, dir } = usePreferences();

  const value = useMemo<I18nValue>(() => {
    const t = (key: string): string =>
      lookup(DICTIONARIES[language], key) ?? lookup(DICTIONARIES.en, key) ?? key;
    return { t, language, dir };
  }, [language, dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}