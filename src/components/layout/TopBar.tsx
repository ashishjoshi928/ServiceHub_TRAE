import { ChevronDown, Menu, Moon, Search, Settings, ShieldCheck, Sun } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { useStore } from "@/lib/store";
import { isPreviewMode } from "@/lib/supabaseClient";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { useTimezone } from "@/hooks/useTimezone";
import { LANGUAGES, PERSONAS, ROLE_ICON, TIMEZONES } from "@/lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/radix";
import { PersonaAvatar } from "@/components/common/badges";
import { relativeTime } from "@/lib/format";
import type { UserRole } from "@/lib/types";

interface Props {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export function TopBar({ onOpenSearch, onOpenSettings, onToggleSidebar }: Props) {
  const { t } = useI18n();
  const { currentProfile, currentRole, setPersona } = useStore();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { timezone, setTimezone } = useTimezone();

  const RoleIcon = ROLE_ICON[currentRole];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-3 sm:px-4">
      <button onClick={onToggleSidebar} className="rounded-md p-2 hover:bg-accent lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand */}
      <div className="flex min-w-0 items-center gap-2.5">
        <LogoMark />
        <div className="hidden min-w-0 leading-tight sm:block">
          <div className="truncate text-sm font-semibold">{t("common.appName")}</div>
        </div>
      </div>

      {/* Workspace indicator */}
      <div className="hidden items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground md:flex">
        <RoleIcon className="h-3.5 w-3.5" />
        {t(`personas.${currentRole}`)}
      </div>

      <div className="flex-1" />

      {/* Preview badge */}
      {isPreviewMode && (
        <span className="hidden items-center gap-1 rounded-full border border-amber-300/50 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 sm:inline-flex">
          <ShieldCheck className="h-3 w-3" />
          {t("common.previewMode")}
        </span>
      )}

      {/* Global search */}
      <button
        onClick={onOpenSearch}
        className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline">{t("common.search")}…</span>
      </button>

      {/* Persona switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-accent sm:flex">
          <span>{t(`roles.${currentRole}`)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>{t("common.switchPersona")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PERSONAS.map((p) => {
            const Icon = ROLE_ICON[p.role];
            return (
              <DropdownMenuItem key={p.role} onClick={() => setPersona(p.role)} className="gap-2.5 py-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{t(`roles.${p.role}`)}</div>
                  <div className="truncate text-xs text-muted-foreground">{t(`personas.${p.role}Desc`)}</div>
                </div>
                {currentRole === p.role && <span className="h-2 w-2 rounded-full bg-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile / settings dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full ring-offset-background focus:outline-none">
          <PersonaAvatar profile={currentProfile} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2 py-2">
            <PersonaAvatar profile={currentProfile} />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{currentProfile.full_name}</div>
              <div className="truncate text-xs text-muted-foreground">{currentProfile.email}</div>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("settings.theme")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <DropdownMenuRadioItem value="system"><Sun className="h-4 w-4" /> {t("settings.themeSystem")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="light"><Sun className="h-4 w-4" /> {t("settings.themeLight")}</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon className="h-4 w-4" /> {t("settings.themeDark")}</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("settings.language")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
            {LANGUAGES.map((l) => (
              <DropdownMenuRadioItem key={l.value} value={l.value}>
                <span className="flex items-center gap-2"><span>{l.flag}</span> {l.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
            <Settings className="h-4 w-4" /> {t("common.settings")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function LogoMark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M12 4l6 3.5v5.2c0 3-2.1 5.5-6 7.3-3.9-1.8-6-4.3-6-7.3V7.5L12 4z" fill="currentColor" />
        <path d="M12 8v4" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}