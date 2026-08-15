import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Gauge,
  Router,
  Siren,
  UserCircle2,
  ShieldCheck,
  Zap,
  CircleDot,
} from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";

interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "Operations",
    items: [
      {
        to: "/dashboard",
        label: "Overview",
        description: "Fleet health & telemetry",
        icon: Gauge,
      },
      {
        to: "/devices",
        label: "Devices",
        description: "Connected hardware",
        icon: Router,
      },
      {
        to: "/alerts",
        label: "Alerts",
        description: "Incidents & warnings",
        icon: Siren,
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        to: "/profile",
        label: "Profile",
        description: "Settings & security",
        icon: UserCircle2,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        to: "/admin/users",
        label: "Users",
        description: "Access & roles",
        icon: ShieldCheck,
        adminOnly: true,
      },
    ],
  },
];

export function SideNav() {
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleSections = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((s) => s.items.length > 0);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-surface-stroke bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 h-14 border-b border-surface-stroke">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-signal-healthy/15 text-signal-healthy">
          <Zap className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-signal-healthy pulse-healthy" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">Voltra</span>
          <span className="text-[10px] uppercase tracking-widest text-text-tertiary">
            Operations console
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {visibleSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? "mt-6" : ""}>
            <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-text-tertiary">
              {section.title}
            </div>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-text-primary"
                          : "text-text-secondary hover:bg-sidebar-accent/60 hover:text-text-primary",
                      ].join(" ")}
                    >
                      <span
                        aria-hidden
                        className={[
                          "absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-signal-healthy transition-all",
                          active ? "w-[3px] opacity-100" : "w-0 opacity-0",
                        ].join(" ")}
                      />
                      <span
                        className={[
                          "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors",
                          active
                            ? "border-signal-healthy/40 bg-signal-healthy/10 text-signal-healthy"
                            : "border-surface-stroke bg-surface-inset text-text-tertiary group-hover:text-text-primary",
                        ].join(" ")}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate font-medium">{item.label}</span>
                        <span className="truncate text-[11px] text-text-tertiary">
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-surface-stroke px-4 py-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <CircleDot className="h-3 w-3 text-signal-healthy" />
          All systems
        </span>
        <span className="font-telemetry normal-case tracking-normal">v1.0.0</span>
      </div>
    </aside>
  );
}