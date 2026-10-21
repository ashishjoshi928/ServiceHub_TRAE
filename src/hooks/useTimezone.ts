import { usePreferences } from "@/lib/preferences";

/**
 * Hydration-safe timezone hook.
 * All SLA timers, created dates, and audit logs are formatted using the
 * active timezone from this hook.
 */
export function useTimezone(): {
  timezone: string;
  setTimezone: (tz: string) => void;
} {
  const { timezone, setTimezone } = usePreferences();
  return { timezone, setTimezone };
}