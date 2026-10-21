import {
  AppWindow,
  Building2,
  CreditCard,
  FileText,
  KeyRound,
  Laptop,
  Monitor,
  Receipt,
  Shield,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Laptop,
  AppWindow,
  Shield,
  KeyRound,
  UserPlus,
  Building2,
  Receipt,
  CreditCard,
  Monitor,
  FileText,
};

export function CatalogIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && ICONS[name]) || FileText;
  return <Icon className={className ?? "h-5 w-5"} />;
}