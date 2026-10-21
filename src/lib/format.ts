import type { Language } from "./types";

// Timezone-aware formatting using Intl — no server/client mismatch.
export function formatDate(
  iso: string | null | undefined,
  timezone: string,
  locale: Language,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  }).format(date);
}

export function formatDateOnly(
  iso: string | null | undefined,
  timezone: string,
  locale: Language,
): string {
  return formatDate(iso, timezone, locale, {
    hour: undefined,
    minute: undefined,
  });
}

// Returns the remaining SLA time as a human-readable signed string.
export function slaRemaining(
  slaDueAt: string | null | undefined,
): { ms: number; label: (t: (k: string) => string) => string; breached: boolean } {
  if (!slaDueAt) return { ms: 0, breached: false, label: () => "—" };
  const ms = new Date(slaDueAt).getTime() - Date.now();
  const breached = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  const label = () => {
    const body = h > 0 ? `${h}h ${m}m` : `${m}m`;
    return `${breached ? "+" : ""}${body}`;
  };
  return { ms, breached, label };
}

export function relativeTime(
  iso: string | null | undefined,
  locale: Language,
): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar" : "en", {
    numeric: "auto",
  });
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  return rtf.format(-days, "day");
}