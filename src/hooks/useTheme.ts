import { usePreferences } from "@/lib/preferences";
import type { ThemeMode } from "@/lib/types";

/**
 * Hydration-safe theme hook.
 * - `theme`: the persisted preference (system | light | dark).
 * - `resolvedTheme`: the effective theme after resolving "system".
 * - `setTheme`: persists the preference to localStorage and applies the class.
 */
export function useTheme(): {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  resolvedTheme: "light" | "dark";
} {
  const { theme, setTheme, resolvedTheme } = usePreferences();
  return { theme, setTheme, resolvedTheme };
}