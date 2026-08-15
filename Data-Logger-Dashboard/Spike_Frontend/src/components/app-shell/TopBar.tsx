import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { useSocketStatus } from "@/lib/socket/socketClient";
import { useNavigate } from "@tanstack/react-router";
import { Moon, Sun, LogOut, User as UserIcon, Activity } from "lucide-react";
import { useTheme } from "@/lib/theme/useTheme";
import { MobileNav } from "./MobileNav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function useUtcClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setT(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return `UTC ${t.toISOString().slice(11, 19)}`;
}

export function TopBar() {
  const { user, logout } = useAuth();
  const clock = useUtcClock();
  const status = useSocketStatus();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const connected = status === "connected" || status === "idle"; // idle in Stage 1 = "no live subs yet"
  const initials =
    user?.name
      ?.split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <header className="h-14 flex items-center justify-between gap-4 border-b border-surface-stroke bg-surface-elevated px-6">
      <div className="flex items-center gap-3 text-xs text-text-secondary">
        <MobileNav />
        <span className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-signal-healthy" />
          <span
            className={[
              "h-2 w-2 rounded-full",
              connected ? "bg-signal-healthy pulse-healthy" : "bg-signal-warning",
            ].join(" ")}
          />
          {connected ? "Live connection" : "Reconnecting…"}
        </span>
        <span className="text-surface-stroke">|</span>
        <span className="font-telemetry text-text-secondary">{clock}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          className="grid h-9 w-9 place-items-center rounded-md border border-surface-stroke bg-surface-inset text-text-secondary hover:text-text-primary hover:border-signal-healthy/40 transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-surface-inset transition-colors">
          <div className="text-right leading-tight">
            <div className="text-xs font-medium text-text-primary">{user?.name ?? "Guest"}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
              {user?.role ?? "—"}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-healthy/15 text-signal-healthy text-xs font-semibold">
            {initials}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-text-tertiary text-[10px] uppercase tracking-widest">
            Signed in
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
            <UserIcon className="mr-2 h-3.5 w-3.5" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-signal-critical focus:text-signal-critical"
            onSelect={async () => {
              await logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}