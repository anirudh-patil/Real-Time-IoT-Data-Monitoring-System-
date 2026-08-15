import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Cpu, RefreshCw, Signal, SignalZero } from "lucide-react";
import { TelemetryChart } from "@/components/dashboard/TelemetryChart";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { mockAlerts, mockDevices, mockTelemetrySeries } from "@/lib/mock/telemetry";
import type { Reading } from "@/lib/api/types";

export const Route = createFileRoute("/_authenticated/devices/$deviceId")({
  loader: ({ params }) => {
    const device = mockDevices().find((d) => d.deviceId === params.deviceId);
    if (!device) throw notFound();
    return { device };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.device.name} — Voltra` : "Device — Voltra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: DeviceNotFound,
  component: DeviceDetail,
});

type Metric = "voltage" | "current" | "power" | "temperature";

const METRIC_TABS: { key: Metric; label: string; unit: string }[] = [
  { key: "power", label: "Power", unit: "kW" },
  { key: "voltage", label: "Voltage", unit: "V" },
  { key: "current", label: "Current", unit: "A" },
  { key: "temperature", label: "Temperature", unit: "°C" },
];

function DeviceNotFound() {
  return (
    <div className="rounded-lg border border-surface-stroke bg-surface-elevated p-8 text-center">
      <div className="text-sm text-text-secondary">Device not found.</div>
      <Link
        to="/devices"
        className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-signal-healthy hover:underline"
      >
        <ArrowLeft className="h-3 w-3" /> Back to devices
      </Link>
    </div>
  );
}

function DeviceDetail() {
  const { device } = Route.useLoaderData();
  const [series, setSeries] = useState<Reading[]>(() => mockTelemetrySeries(80));
  const [metric, setMetric] = useState<Metric>("power");

  const alerts = useMemo(
    () => mockAlerts().filter((a) => a.deviceId === device.deviceId),
    [device.deviceId],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1];
        const voltage = Math.max(215, Math.min(245, last.voltage + (Math.random() - 0.5) * 2));
        const current = Math.max(12, Math.min(24, last.current + (Math.random() - 0.5) * 0.6));
        const temperature = Math.max(
          32,
          Math.min(58, last.temperature + (Math.random() - 0.5) * 0.4),
        );
        const next: Reading = {
          deviceId: device.deviceId,
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
  }, [device.deviceId]);

  const latest = series[series.length - 1];
  const seen = new Date(device.lastSeenAt ?? Date.now());
  const mins = Math.max(1, Math.round((Date.now() - seen.getTime()) / 60_000));

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/devices"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-text-tertiary hover:text-text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Devices
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-signal-healthy/15 text-signal-healthy">
            <Cpu className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {device.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 font-telemetry text-xs text-text-tertiary">
              <span>{device.deviceId}</span>
              <span className="text-surface-stroke">·</span>
              <span>fw {device.firmwareVersion}</span>
              <span className="text-surface-stroke">·</span>
              <span>last seen {mins}m ago</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs",
              device.online
                ? "bg-signal-healthy/10 text-signal-healthy"
                : "bg-signal-critical/10 text-signal-critical",
            ].join(" ")}
          >
            {device.online ? (
              <Signal className="h-3.5 w-3.5" />
            ) : (
              <SignalZero className="h-3.5 w-3.5" />
            )}
            {device.online ? "Online" : "Offline"}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-surface-stroke bg-surface-elevated px-3 py-1.5 text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Power" value={latest.power.toFixed(2)} unit="kW" tone="healthy" />
        <KpiCard label="Voltage" value={latest.voltage.toFixed(1)} unit="V" />
        <KpiCard label="Current" value={latest.current.toFixed(1)} unit="A" />
        <KpiCard
          label="Temperature"
          value={latest.temperature.toFixed(1)}
          unit="°C"
          tone={latest.temperature > 55 ? "warning" : "default"}
        />
      </section>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-stroke px-5 py-4">
          <div className="text-sm font-semibold text-text-primary">Telemetry · live</div>
          <div className="flex items-center gap-1 rounded-md bg-surface-inset p-1">
            {METRIC_TABS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetric(m.key)}
                className={[
                  "rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
                  metric === m.key
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-tertiary hover:text-text-primary",
                ].join(" ")}
              >
                {m.label}
              </button>
            ))}
          </div>
        </header>
        <div className="p-4">
          <TelemetryChart data={series} metric={metric} height={280} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
          <header className="border-b border-surface-stroke px-5 py-4 text-sm font-semibold text-text-primary">
            Metadata
          </header>
          <dl className="divide-y divide-surface-stroke text-sm">
            {[
              ["Device ID", device.deviceId],
              ["Owner", device.ownerId],
              ["Firmware", device.firmwareVersion],
              ["Created", new Date(device.createdAt).toLocaleString()],
              ["Updated", new Date(device.updatedAt).toLocaleString()],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3">
                <dt className="text-[11px] uppercase tracking-widest text-text-tertiary">{k}</dt>
                <dd className="font-telemetry text-xs text-text-secondary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
          <header className="border-b border-surface-stroke px-5 py-4 text-sm font-semibold text-text-primary">
            Recent alerts
          </header>
          {alerts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-text-tertiary">
              No active alerts for this device.
            </div>
          ) : (
            <ul className="divide-y divide-surface-stroke">
              {alerts.map((a) => {
                const tone =
                  a.severity === "critical"
                    ? "text-signal-critical border-l-signal-critical"
                    : "text-signal-warning border-l-signal-warning";
                return (
                  <li key={a.alertId} className={`border-l-2 ${tone} px-5 py-3`}>
                    <div className="text-[10px] uppercase tracking-widest">
                      {a.type.replace(/_/g, " ")}
                    </div>
                    <div className="mt-1 text-sm text-text-primary">{a.message}</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}