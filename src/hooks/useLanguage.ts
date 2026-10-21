import { usePreferences } from "@/lib/preferences";
import type { Language } from "@/lib/types";

/**
 * Hydration-safe language hook.
 * Switching language also flips the document direction (LTR <-> RTL) for
 * full Arabic support — not just a layout mirror.
 */
export function useLanguage(): {
  language: Language;
  setLanguage: (l: Language) => void;
  dir: "ltr" | "rtl";
} {
  const { language, setLanguage, dir } = usePreferences();
  return { language, setLanguage, dir };
}