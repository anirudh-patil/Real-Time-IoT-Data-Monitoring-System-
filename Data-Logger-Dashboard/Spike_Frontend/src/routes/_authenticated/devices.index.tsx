import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, Search, Signal, SignalZero } from "lucide-react";
import { mockDevices } from "@/lib/mock/telemetry";

export const Route = createFileRoute("/_authenticated/devices/")({
  head: () => ({
    meta: [
      { title: "Devices — Voltra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DevicesPage,
});

type StatusFilter = "all" | "online" | "offline";

function DevicesPage() {
  const devices = useMemo(() => mockDevices(), []);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = devices.filter((d) => {
    if (status === "online" && !d.online) return false;
    if (status === "offline" && d.online) return false;
    if (q) {
      const needle = q.toLowerCase();
      if (
        !d.name.toLowerCase().includes(needle) &&
        !d.deviceId.toLowerCase().includes(needle)
      )
        return false;
    }
    return true;
  });

  const onlineCount = devices.filter((d) => d.online).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
            Fleet inventory
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Devices</h1>
          <p className="text-sm text-text-secondary mt-1">
            <span className="font-telemetry">{onlineCount}</span> of{" "}
            <span className="font-telemetry">{devices.length}</span> reporting · rolling 5m window
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or ID"
              className="w-64 rounded-md border border-surface-stroke bg-surface-elevated pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-signal-healthy/60"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md bg-surface-inset p-1">
            {(["all", "online", "offline"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={[
                  "rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors capitalize",
                  status === s
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

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-text-tertiary border-b border-surface-stroke">
              <th className="text-left px-5 py-3 font-medium">Device</th>
              <th className="text-left px-5 py-3 font-medium">ID</th>
              <th className="text-left px-5 py-3 font-medium">Firmware</th>
              <th className="text-left px-5 py-3 font-medium">Last seen</th>
              <th className="text-right px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-stroke">
            {filtered.map((d) => {
              const seen = new Date(d.lastSeenAt ?? Date.now());
              const mins = Math.max(1, Math.round((Date.now() - seen.getTime()) / 60_000));
              return (
                <tr key={d.deviceId} className="hover:bg-surface-inset/50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      to="/devices/$deviceId"
                      params={{ deviceId: d.deviceId }}
                      className="flex items-center gap-3 group"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-inset text-text-secondary group-hover:text-signal-healthy">
                        <Cpu className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-text-primary group-hover:text-signal-healthy">
                        {d.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-telemetry text-xs text-text-tertiary">
                    {d.deviceId}
                  </td>
                  <td className="px-5 py-3 font-telemetry text-xs text-text-secondary">
                    {d.firmwareVersion}
                  </td>
                  <td className="px-5 py-3 font-telemetry text-xs text-text-secondary">
                    {mins}m ago
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 text-xs",
                        d.online ? "text-signal-healthy" : "text-signal-critical",
                      ].join(" ")}
                    >
                      {d.online ? (
                        <Signal className="h-3.5 w-3.5" />
                      ) : (
                        <SignalZero className="h-3.5 w-3.5" />
                      )}
                      {d.online ? "Online" : "Offline"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-tertiary">
                  No devices match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}