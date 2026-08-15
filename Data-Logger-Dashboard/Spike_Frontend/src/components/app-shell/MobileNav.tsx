import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Zap, CircleDot, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/useAuth";
import { navSections } from "./navItems";

const STORAGE_KEY = "voltra:mobileNav:openSections";

function readStoredOpen(): Record<string, boolean> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
  } catch {
    return null;
  }
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleSections = navSections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || isAdmin) }))
    .filter((s) => s.items.length > 0);

  const activeSectionTitle = useMemo(() => {
    for (const section of visibleSections) {
      for (const item of section.items) {
        if (pathname === item.to || pathname.startsWith(item.to + "/")) {
          return section.title;
        }
      }
    }
    return null;
  }, [pathname, visibleSections]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const stored = readStoredOpen();
    const initial: Record<string, boolean> = {};
    for (const s of navSections) {
      initial[s.title] = stored?.[s.title] ?? true;
    }
    return initial;
  });

  // Auto-expand the section containing the active route so the highlight is
  // always visible after navigation.
  useEffect(() => {
    if (!activeSectionTitle) return;
    setOpenSections((prev) =>
      prev[activeSectionTitle] ? prev : { ...prev, [activeSectionTitle]: true },
    );
  }, [activeSectionTitle]);

  // Persist open/closed state across route changes and sessions.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
    } catch {
      /* ignore */
    }
  }, [openSections]);

  const toggleSection = (title: string) =>
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));

  // Roving keyboard navigation across all focusable nav controls
  // (section headers + links) inside the drawer.
  const navRef = useRef<HTMLElement | null>(null);
  const getFocusables = () => {
    const root = navRef.current;
    if (!root) return [] as HTMLElement[];
    return Array.from(
      root.querySelectorAll<HTMLElement>("[data-nav-focusable]"),
    ).filter((el) => !el.hasAttribute("data-nav-disabled"));
  };

  const handleNavKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target || !target.matches("[data-nav-focusable]")) return;
    const items = getFocusables();
    const idx = items.indexOf(target);
    if (idx === -1) return;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        items[(idx + 1) % items.length]?.focus();
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
        break;
      }
      case "Home": {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case "End": {
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      }
      case "ArrowRight": {
        const title = target.getAttribute("data-section-header");
        if (title) {
          e.preventDefault();
          if (!(openSections[title] ?? true)) toggleSection(title);
        }
        break;
      }
      case "ArrowLeft": {
        const title = target.getAttribute("data-section-header");
        if (title) {
          e.preventDefault();
          if (openSections[title] ?? true) toggleSection(title);
        }
        break;
      }
    }
  };

  const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-healthy focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className={
            "md:hidden grid h-9 w-9 place-items-center rounded-md border border-surface-stroke bg-surface-inset text-text-secondary hover:text-text-primary hover:border-signal-healthy/40 transition-colors motion-reduce:transition-none " +
            focusRing
          }
        >
          <Menu className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-r border-surface-stroke bg-sidebar text-sidebar-foreground p-0 flex flex-col"
      >
        <div className="flex items-center gap-3 px-5 h-14 border-b border-surface-stroke">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-signal-healthy/15 text-signal-healthy">
            <Zap className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-signal-healthy pulse-healthy motion-reduce:animate-none" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">Voltra</span>
            <span className="text-[10px] uppercase tracking-widest text-text-tertiary">
              Operations console
            </span>
          </div>
        </div>

        <nav
          ref={navRef}
          onKeyDown={handleNavKeyDown}
          aria-label="Primary"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          {visibleSections.map((section, idx) => {
            const isOpen = openSections[section.title] ?? true;
            const isActiveSection = section.title === activeSectionTitle;
            const panelId = `mobilenav-section-${idx}`;
            return (
            <div key={section.title} className={idx > 0 ? "mt-6" : ""}>
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                data-nav-focusable
                data-section-header={section.title}
                className={
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 pb-2 pt-1 text-[10px] uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors motion-reduce:transition-none " +
                  focusRing
                }
              >
                <span className="inline-flex items-center gap-2">
                  {section.title}
                  {isActiveSection ? (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-signal-healthy pulse-healthy motion-reduce:animate-none"
                    />
                  ) : null}
                </span>
                <ChevronDown
                  className={[
                    "h-3.5 w-3.5 transition-transform motion-reduce:transition-none",
                    isOpen ? "rotate-0" : "-rotate-90",
                  ].join(" ")}
                />
              </button>
              <ul
                id={panelId}
                role="list"
                hidden={!isOpen}
                className="space-y-0.5"
              >
                {section.items.map((item) => {
                  const active =
                    pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        data-nav-focusable
                        className={[
                          "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none",
                          active
                            ? "bg-sidebar-accent text-text-primary"
                            : "text-text-secondary hover:bg-sidebar-accent/60 hover:text-text-primary",
                          focusRing,
                        ].join(" ")}
                      >
                        <span
                          aria-hidden
                          className={[
                            "absolute left-0 top-1/2 h-6 -translate-y-1/2 rounded-r-full bg-signal-healthy transition-all motion-reduce:transition-none",
                            active ? "w-[3px] opacity-100" : "w-0 opacity-0",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors motion-reduce:transition-none",
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
            );
          })}
        </nav>

        <div className="border-t border-surface-stroke px-4 py-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-text-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <CircleDot className="h-3 w-3 text-signal-healthy" aria-hidden />
            All systems
          </span>
          <span className="font-telemetry normal-case tracking-normal">v1.0.0</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}