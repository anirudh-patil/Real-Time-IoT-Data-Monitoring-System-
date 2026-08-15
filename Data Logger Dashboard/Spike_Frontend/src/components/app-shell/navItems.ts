import type { LucideIcon } from "lucide-react";
import {
  Gauge,
  Router,
  Siren,
  UserCircle2,
  ShieldCheck,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: "Operations",
    items: [
      { to: "/dashboard", label: "Overview", description: "Fleet health & telemetry", icon: Gauge },
      { to: "/devices", label: "Devices", description: "Connected hardware", icon: Router },
      { to: "/alerts", label: "Alerts", description: "Incidents & warnings", icon: Siren },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile", description: "Settings & security", icon: UserCircle2 },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/admin/users", label: "Users", description: "Access & roles", icon: ShieldCheck, adminOnly: true },
    ],
  },
];