import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Search } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { Badge, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function KnowledgeBase() {
  const { t } = useI18n();
  const { db, currentProfile } = useStore();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const articles = useMemo(() => {
    const org = currentProfile.organization_id ?? "org_global";
    const q = query.trim().toLowerCase();
    return db.articles
      .filter((a) => a.organization_id === org && a.published)
      .filter(
        (a) =>
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.body.toLowerCase().includes(q) ||
          a.tags.some((tg) => tg.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.views - a.views);
  }, [db.articles, currentProfile.organization_id, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("knowledge.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("knowledge.subtitle")}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("knowledge.searchKnowledge")}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <BookOpen className="mb-2 h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{t("knowledge.noArticles")}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {articles.map((a) => {
            const open = openId === a.id;
            return (
              <div key={a.id} className="rounded-xl border bg-card shadow-sm">
                <button
                  onClick={() => setOpenId(open ? null : a.id)}
                  className="flex w-full items-start gap-3 p-4 text-start"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.title}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="px-2 py-0 text-[10px]">{a.category}</Badge>
                      <span>{a.views.toLocaleString()} {t("knowledge.views")}</span>
                    </div>
                  </div>
                  <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>
                {open && (
                  <div className="border-t px-4 py-4">
                    <p className="text-sm leading-relaxed text-foreground/90">{a.body}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.tags.map((tg) => (
                        <span key={tg} className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          #{tg}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}