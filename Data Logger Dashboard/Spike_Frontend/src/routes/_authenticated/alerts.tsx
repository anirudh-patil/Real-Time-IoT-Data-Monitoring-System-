import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Cpu,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react";
import { mockAlertsExtended } from "@/lib/mock/telemetry";
import type { Alert, AlertSeverity, AlertStatus } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Voltra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AlertsPage,
});

type StatusTab = "active" | "resolved" | "all";
type SeverityFilter = "all" | AlertSeverity;

function AlertsPage() {
  const all = useMemo(() => mockAlertsExtended(), []);
  const [tab, setTab] = useState<StatusTab>("active");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [q, setQ] = useState("");
  const [acked, setAcked] = useState<Set<string>>(new Set());

  const filtered = all.filter((a) => {
    if (tab !== "all" && a.status !== (tab as AlertStatus)) return false;
    if (severity !== "all" && a.severity !== severity) return false;
    if (q) {
      const n = q.toLowerCase();
      if (
        !a.message.toLowerCase().includes(n) &&
        !a.deviceId.toLowerCase().includes(n) &&
        !a.type.toLowerCase().includes(n)
      )
        return false;
    }
    return true;
  });

  const counts = {
    active: all.filter((a) => a.status === "active").length,
    critical: all.filter((a) => a.status === "active" && a.severity === "critical").length,
    resolved: all.filter((a) => a.status === "resolved").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
            Incident feed
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Alerts</h1>
          <p className="text-sm text-text-secondary mt-1">
            <span className="font-telemetry text-signal-critical">{counts.critical}</span> critical
            · <span className="font-telemetry">{counts.active}</span> active ·{" "}
            <span className="font-telemetry">{counts.resolved}</span> resolved
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search message, device, type"
              className="w-72 rounded-md border border-surface-stroke bg-surface-elevated pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-signal-healthy/60"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md bg-surface-inset p-1">
            {(["all", "warning", "critical"] as SeverityFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={[
                  "rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors capitalize",
                  severity === s
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-tertiary hover:text-text-primary",
                ].join(" ")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-1 border-b border-surface-stroke">
        {(
          [
            { key: "active", label: `Active · ${counts.active}` },
            { key: "resolved", label: `Resolved · ${counts.resolved}` },
            { key: "all", label: `All · ${all.length}` },
          ] as { key: StatusTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "-mb-px border-b-2 px-4 py-2.5 text-xs uppercase tracking-widest transition-colors",
              tab === t.key
                ? "border-signal-healthy text-text-primary"
                : "border-transparent text-text-tertiary hover:text-text-primary",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-signal-healthy/10 text-signal-healthy">
              <Check className="h-5 w-5" />
            </span>
            <div className="mt-3 text-sm text-text-secondary">No alerts match this view.</div>
          </div>
        ) : (
          <ul className="divide-y divide-surface-stroke">
            {filtered.map((a) => (
              <AlertRow
                key={a.alertId}
                alert={a}
                acknowledged={acked.has(a.alertId)}
                onAck={() => {
                  setAcked((prev) => {
                    const next = new Set(prev);
                    next.add(a.alertId);
                    return next;
                  });
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated p-4 ambient-shadow flex items-center gap-3 text-xs text-text-secondary">
        <Filter className="h-3.5 w-3.5 text-text-tertiary" />
        Acknowledgement is local-only until the backend is wired to{" "}
        <span className="font-telemetry">POST /alerts/:id/resolve</span>.
      </section>
    </div>
  );
}

function AlertRow({
  alert,
  acknowledged,
  onAck,
}: {
  alert: Alert;
  acknowledged: boolean;
  onAck: () => void;
}) {
  const created = new Date(alert.createdAt);
  const mins = Math.max(1, Math.round((Date.now() - created.getTime()) / 60_000));
  const timeLabel = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;

  const severityColor =
    alert.severity === "critical"
      ? "text-signal-critical"
      : "text-signal-warning";
  const border =
    alert.severity === "critical"
      ? "border-l-signal-critical"
      : "border-l-signal-warning";

  return (
    <li className={`flex items-start gap-4 border-l-2 ${border} px-5 py-4 hover:bg-surface-inset/40`}>
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          alert.severity === "critical"
            ? "bg-signal-critical/10 text-signal-critical"
            : "bg-signal-warning/10 text-signal-warning",
        ].join(" ")}
      >
        {alert.severity === "critical" ? (
          <ShieldAlert className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] uppercase tracking-widest ${severityColor}`}>
            {alert.severity}
          </span>
          <span className="text-surface-stroke">·</span>
          <span className="text-[10px] uppercase tracking-widest text-text-tertiary">
            {alert.type.replace(/_/g, " ")}
          </span>
          {alert.status === "resolved" && (
            <>
              <span className="text-surface-stroke">·</span>
              <span className="text-[10px] uppercase tracking-widest text-signal-healthy">
                resolved
              </span>
            </>
          )}
          {acknowledged && alert.status === "active" && (
            <>
              <span className="text-surface-stroke">·</span>
              <span className="text-[10px] uppercase tracking-widest text-signal-info">
                acknowledged
              </span>
            </>
          )}
        </div>
        <div className="mt-1 text-sm text-text-primary">{alert.message}</div>
        <div className="mt-1 flex items-center gap-2 font-telemetry text-[11px] text-text-tertiary">
          <Cpu className="h-3 w-3" />
          <Link
            to="/devices/$deviceId"
            params={{ deviceId: alert.deviceId }}
            className="hover:text-text-primary"
          >
            {alert.deviceId}
          </Link>
          <span className="text-surface-stroke">·</span>
          <span>{timeLabel}</span>
          {alert.resolvedAt && (
            <>
              <span className="text-surface-stroke">·</span>
              <span>resolved {new Date(alert.resolvedAt).toLocaleTimeString()}</span>
            </>
          )}
        </div>
      </div>
      {alert.status === "active" && (
        <button
          type="button"
          onClick={onAck}
          disabled={acknowledged}
          className="shrink-0 rounded-md border border-surface-stroke bg-surface-inset px-3 py-1.5 text-[11px] uppercase tracking-widest text-text-secondary hover:text-text-primary hover:border-signal-healthy/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {acknowledged ? "Acked" : "Acknowledge"}
        </button>
      )}
    </li>
  );
}