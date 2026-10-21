import { useMemo, useState } from "react";
import { FileText, Search, TicketCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { UserRole } from "@/lib/types";
import { PriorityBadge, StatusBadge } from "@/components/common/badges";
import { formatDate } from "@/lib/format";
import { usePreferences } from "@/lib/preferences";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (role: UserRole, view: string) => void;
  onOpenTicket: (id: string) => void;
}

export function GlobalSearch({ open, onClose, onNavigate, onOpenTicket }: Props) {
  const { t } = useI18n();
  const { db, currentRole, currentProfile } = useStore();
  const { timezone, language } = usePreferences();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { tickets: [], catalog: [], articles: [] };
    const scope = (orgId: string) =>
      currentRole === "super_admin" ? true : orgId === currentProfile.organization_id;
    return {
      tickets: db.tickets.filter(
        (tk) =>
          scope(tk.organization_id) &&
          (tk.subject.toLowerCase().includes(q) ||
            tk.ticket_number.toLowerCase().includes(q) ||
            (tk.description ?? "").toLowerCase().includes(q)),
      ),
      catalog: db.catalog.filter(
        (c) =>
          scope(c.organization_id) &&
          (c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q)),
      ),
      articles: db.articles.filter(
        (a) =>
          scope(a.organization_id) &&
          (a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)),
      ),
    };
  }, [query, db, currentRole, currentProfile.organization_id]);

  const hasResults =
    results.tickets.length > 0 || results.catalog.length > 0 || results.articles.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-24 translate-y-0 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> {t("common.searchResults")}
          </DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("common.searchPlaceholder")}
          className="h-10"
        />
        <div className="max-h-[50vh] overflow-y-auto pr-1">
          {!query && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noSearchQuery")}</p>
          )}
          {query && !hasResults && (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noResults")}</p>
          )}

          {results.tickets.length > 0 && (
            <Group label={`${t("common.tickets")} (${results.tickets.length})`}>
              {results.tickets.slice(0, 6).map((tk) => (
                <button
                  key={tk.id}
                  onClick={() => onOpenTicket(tk.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-accent"
                >
                  <TicketCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{tk.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {tk.ticket_number} · {formatDate(tk.created_at, timezone, language)}
                    </div>
                  </div>
                  <PriorityBadge priority={tk.priority} />
                  <StatusBadge status={tk.status} />
                </button>
              ))}
            </Group>
          )}

          {results.catalog.length > 0 && (
            <Group label={`${t("common.catalog")} (${results.catalog.length})`}>
              {results.catalog.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onNavigate("requester", "catalog")}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-accent"
                >
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{c.name}</span>
                </button>
              ))}
            </Group>
          )}

          {results.articles.length > 0 && (
            <Group label={`${t("common.knowledge")} (${results.articles.length})`}>
              {results.articles.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => onNavigate("requester", "knowledge")}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-accent"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{a.title}</span>
                </button>
              ))}
            </Group>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}