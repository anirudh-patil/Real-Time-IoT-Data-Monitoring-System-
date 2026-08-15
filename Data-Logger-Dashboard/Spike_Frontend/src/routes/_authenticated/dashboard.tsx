import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Signal,
  Zap,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TelemetryChart } from "@/components/dashboard/TelemetryChart";
import {
  mockAlerts,
  mockDevices,
  mockKpis,
  mockTelemetrySeries,
} from "@/lib/mock/telemetry";
import type { Reading } from "@/lib/api/types";
import { usePersistedQuery } from "@/lib/swr/persistedQuery";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Voltra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type Metric = "voltage" | "current" | "power" | "temperature";

const METRIC_TABS: { key: Metric; label: string; unit: string }[] = [
  { key: "power", label: "Power", unit: "kW" },
  { key: "voltage", label: "Voltage", unit: "V" },
  { key: "current", label: "Current", unit: "A" },
  { key: "temperature", label: "Temperature", unit: "°C" },
];

// Simulate a network round-trip so the SWR pattern is observable in the
// design preview. Swap these fetchers for `apiClient.get(...)` when the
// backend is online — the SWR wiring stays the same.
const NET_MS = 600;
function withLatency<T>(fn: () => T): Promise<T> {
  return new Promise((r) => setTimeout(() => r(fn()), NET_MS));
}

function formatRelative(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function DashboardPage() {
  const kpisQ = usePersistedQuery("dashboard.kpis", ["dashboard", "kpis"], () =>
    withLatency(() => mockKpis()),
  );
  const devicesQ = usePersistedQuery("dashboard.devices", ["dashboard", "devices"], () =>
    withLatency(() => mockDevices()),
  );
  const alertsQ = usePersistedQuery("dashboard.alerts", ["dashboard", "alerts"], () =>
    withLatency(() => mockAlerts()),
  );
  const seriesQ = usePersistedQuery("dashboard.series", ["dashboard", "series"], () =>
    withLatency(() => mockTelemetrySeries(60)),
  );

  const kpis = kpisQ.data ?? mockKpis();
  const devices = devicesQ.data ?? [];
  const alerts = alertsQ.data ?? [];
  const [series, setSeries] = useState<Reading[]>(
    () => seriesQ.data ?? mockTelemetrySeries(60),
  );
  const [metric, setMetric] = useState<Metric>("power");

  // When a background revalidation of the series completes, re-seed the
  // rolling window and let the live tick continue from there.
  useEffect(() => {
    if (seriesQ.data && seriesQ.data.length > 0) {
      setSeries(seriesQ.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesQ.dataUpdatedAt]);

  const isRevalidating =
    kpisQ.isRevalidating ||
    devicesQ.isRevalidating ||
    alertsQ.isRevalidating ||
    seriesQ.isRevalidating;
  const lastUpdatedAt = Math.max(
    kpisQ.dataUpdatedAt || 0,
    devicesQ.dataUpdatedAt || 0,
    alertsQ.dataUpdatedAt || 0,
  );

  // Simulate a live tick until the Socket.IO stream is wired to the backend.
  useEffect(() => {
    const id = window.setInterval(() => {
      setSeries((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const drift = (Math.random() - 0.5) * 2;
        const voltage = Math.max(215, Math.min(245, last.voltage + drift));
        const current = Math.max(12, Math.min(24, last.current + (Math.random() - 0.5) * 0.6));
        const temperature = Math.max(
          32,
          Math.min(58, last.temperature + (Math.random() - 0.5) * 0.4),
        );
        const next: Reading = {
          deviceId: "fleet-aggregate",
          timestamp: new Date().toISOString(),
          voltage,
          current,
          power: (voltage * current) / 1000,
          temperature,
        };
        return [...prev.slice(1), next];
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  const latest = series[series.length - 1] ?? {
    deviceId: "fleet-aggregate",
    timestamp: new Date().toISOString(),
    voltage: 0,
    current: 0,
    power: 0,
    temperature: 0,
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
            Operational overview
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            Fleet at a glance
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Aggregated telemetry across {kpis.fleetSize} monitored devices. Streaming preview —
            live socket feed activates when the backend is online.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-tertiary">
          {isRevalidating ? (
            <span className="flex items-center gap-1.5 text-signal-info">
              <RefreshCw className="h-3 w-3 animate-spin motion-reduce:animate-none" />
              Refreshing
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-healthy pulse-healthy" />
              Live
            </span>
          )}
          <span className="text-surface-stroke">·</span>
          <span className="font-telemetry text-text-secondary">
            {lastUpdatedAt ? `Updated ${formatRelative(lastUpdatedAt)}` : "2.5s cadence"}
          </span>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Fleet online"
          value={kpis.online}
          hint={
            <span>
              of <span className="font-telemetry">{kpis.fleetSize}</span> devices reporting
            </span>
          }
          tone="healthy"
          icon={<Signal className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg power"
          value={kpis.avgPowerKw.toFixed(1)}
          unit="kW"
          hint={`Peak ${kpis.peakPowerKw.toFixed(1)} kW · last 24h`}
          icon={<Zap className="h-4 w-4" />}
        />
        <KpiCard
          label="Active alerts"
          value={kpis.activeAlerts}
          hint={
            <span className="text-signal-warning">
              {kpis.criticalAlerts} critical · {kpis.activeAlerts - kpis.criticalAlerts} warning
            </span>
          }
          tone={kpis.criticalAlerts > 0 ? "critical" : "warning"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <KpiCard
          label="Uptime · 30d"
          value={kpis.uptimePct.toFixed(2)}
          unit="%"
          hint="SLA target 99.00%"
          tone="healthy"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
      </section>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-stroke px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-healthy/15 text-signal-healthy">
              <Activity className="h-4 w-4" />
            </span>
            <div>
              <div className="text-sm font-semibold text-text-primary">Fleet telemetry</div>
              <div className="text-xs text-text-secondary">Aggregate signal · rolling window</div>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-surface-inset p-1">
            {METRIC_TABS.map((m) => {
              const active = metric === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMetric(m.key)}
                  className={[
                    "rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
                    active
                      ? "bg-surface-elevated text-text-primary"
                      : "text-text-tertiary hover:text-text-primary",
                  ].join(" ")}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </header>
        <div className="grid grid-cols-4 divide-x divide-surface-stroke border-b border-surface-stroke text-xs">
          {METRIC_TABS.map((m) => (
            <div key={m.key} className="px-5 py-3">
              <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
                {m.label}
              </div>
              <div className="mt-1 font-telemetry text-lg text-text-primary">
                {latest[m.key].toFixed(m.key === "power" ? 2 : 1)}
                <span className="ml-1 text-[10px] uppercase tracking-widest text-text-tertiary">
                  {m.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4">
          <TelemetryChart data={series} metric={metric} height={260} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
          <header className="flex items-center justify-between border-b border-surface-stroke px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-info/15 text-signal-info">
                <Cpu className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-text-primary">Devices</div>
                <div className="text-xs text-text-secondary">Recent status</div>
              </div>
            </div>
            <Link
              to="/devices"
              className="text-xs uppercase tracking-widest text-text-tertiary hover:text-text-primary"
            >
              View all →
            </Link>
          </header>
          <ul className="divide-y divide-surface-stroke">
            {devices.slice(0, 6).map((d) => {
              const seen = new Date(d.lastSeenAt ?? Date.now());
              const mins = Math.max(1, Math.round((Date.now() - seen.getTime()) / 60_000));
              return (
                <li
                  key={d.deviceId}
                  className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-surface-inset/60"
                >
                  <span
                    className={[
                      "h-2 w-2 rounded-full",
                      d.online ? "bg-signal-healthy pulse-healthy" : "bg-signal-critical",
                    ].join(" ")}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium text-text-primary">{d.name}</div>
                    <div className="font-telemetry text-[11px] text-text-tertiary">
                      {d.deviceId} · fw {d.firmwareVersion}
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className={d.online ? "text-signal-healthy" : "text-signal-critical"}>
                      {d.online ? "Online" : "Offline"}
                    </div>
                    <div className="font-telemetry text-[11px] text-text-tertiary">
                      {mins}m ago
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:col-span-2 rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
          <header className="flex items-center justify-between border-b border-surface-stroke px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal-critical/15 text-signal-critical">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold text-text-primary">Active alerts</div>
                <div className="text-xs text-text-secondary">Unresolved</div>
              </div>
            </div>
            <Link
              to="/alerts"
              className="text-xs uppercase tracking-widest text-text-tertiary hover:text-text-primary"
            >
              Manage →
            </Link>
          </header>
          <ul className="divide-y divide-surface-stroke">
            {alerts.map((a) => {
              const mins = Math.max(
                1,
                Math.round((Date.now() - new Date(a.createdAt).getTime()) / 60_000),
              );
              const tone =
                a.severity === "critical"
                  ? "text-signal-critical border-l-signal-critical"
                  : "text-signal-warning border-l-signal-warning";
              return (
                <li key={a.alertId} className={`border-l-2 ${tone} px-5 py-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest">
                      {a.type.replace(/_/g, " ")}
                    </span>
                    <span className="font-telemetry text-[10px] text-text-tertiary">
                      {mins}m
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-text-primary">{a.message}</div>
                  <div className="mt-1 font-telemetry text-[11px] text-text-tertiary">
                    {a.deviceId}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow flex items-center gap-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-healthy/15 text-signal-healthy">
          <Gauge className="h-4 w-4" />
        </span>
        <div className="flex-1 text-sm">
          <div className="font-semibold text-text-primary">Backend not yet connected</div>
          <div className="text-text-secondary">
            Values shown are synthesized for design review. When the API is online, this page will
            pull from <span className="font-telemetry">/dashboard</span> and stream via Socket.IO.
          </div>
        </div>
      </section>
    </div>
  );
}