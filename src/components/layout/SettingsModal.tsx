import { useState } from "react";
import { Globe, Moon, Palette, Sun, User } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/radix";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/hooks/useLanguage";
import { useTimezone } from "@/hooks/useTimezone";
import { useStore } from "@/lib/store";
import { LANGUAGES, TIMEZONES } from "@/lib/constants";
import { PersonaAvatar } from "@/components/common/badges";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { timezone, setTimezone } = useTimezone();
  const { currentProfile } = useStore();
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> {t("settings.title")}
          </DialogTitle>
          <DialogDescription>{t("settings.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Profile */}
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <PersonaAvatar profile={currentProfile} size="lg" />
              <div className="min-w-0">
                <div className="truncate font-medium">{currentProfile.full_name}</div>
                <div className="truncate text-sm text-muted-foreground">{currentProfile.email}</div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("settings.fullName")}</Label>
              <Input defaultValue={currentProfile.full_name} />
            </div>
            <div className="grid gap-2">
              <Label>{t("settings.jobTitle")}</Label>
              <Input defaultValue={currentProfile.job_title ?? ""} />
            </div>
          </section>

          {/* Theme */}
          <section className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4" /> {t("settings.theme")}
            </Label>
            <div className="grid grid-cols-3 gap-2 rtl:grid-flow-row">
              <ThemeOption active={theme === "system"} onClick={() => setTheme("system")} icon={<Moon className="h-4 w-4" />} label={t("settings.themeSystem")} />
              <ThemeOption active={theme === "light"} onClick={() => setTheme("light")} icon={<Sun className="h-4 w-4" />} label={t("settings.themeLight")} />
              <ThemeOption active={theme === "dark"} onClick={() => setTheme("dark")} icon={<Moon className="h-4 w-4" />} label={t("settings.themeDark")} />
            </div>
          </section>

          {/* Language */}
          <section className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> {t("settings.language")}
            </Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "ar")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    <span className="flex items-center gap-2">
                      <span>{l.flag}</span> {l.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          {/* Timezone */}
          <section className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" /> {t("settings.timezone")}
            </Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                    <span className="text-xs text-muted-foreground"> · {tz.value}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </div>

        <DialogFooter>
          <span className="text-sm text-emerald-600 dark:text-emerald-400">
            {saved ? t("settings.saved") : ""}
          </span>
          <button
            onClick={save}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("common.save")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThemeOption({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors ${
        active ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}