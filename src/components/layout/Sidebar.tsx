import { useI18n } from "@/i18n/I18nProvider";
import { NAV_CONFIG, ROLE_ICON } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PersonaAvatar } from "@/components/common/badges";

interface Props {
  activeView: string;
  onSelect: (view: string) => void;
  sidebarOpen: boolean;
}

export function Sidebar({ activeView, onSelect, sidebarOpen }: Props) {
  const { t } = useI18n();
  const { currentRole, currentProfile, db } = useStore();
  const items = NAV_CONFIG[currentRole];
  const org = db.organizations.find((o) => o.id === currentProfile.organization_id);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-20 mt-14 flex w-64 flex-col border-r bg-card transition-transform lg:static lg:z-0 lg:mt-0 lg:translate-x-0 rtl:left-auto rtl:right-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "rtl:translate-x-0 rtl:data-[closed]:translate-x-full",
      )}
    >
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <PersonaAvatar profile={currentProfile} size="sm" />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">{currentProfile.full_name}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {org?.name ?? "—"} · {t(`roles.${currentRole}`)}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}