import type { Alert, Device, Reading } from "@/lib/api/types";
import type { User, Role } from "@/lib/api/types";

// Deterministic mock data for Stage 4 — the backend isn't live yet, so we
// generate plausible telemetry client-side to exercise the dashboard UI.
// Everything here is clearly labelled and easy to swap for real API calls
// once the backend is wired up.

function seeded(seed: number) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

export interface KpiSnapshot {
  fleetSize: number;
  online: number;
  offline: number;
  activeAlerts: number;
  criticalAlerts: number;
  avgPowerKw: number;
  peakPowerKw: number;
  uptimePct: number;
}

export function mockKpis(): KpiSnapshot {
  return {
    fleetSize: 128,
    online: 121,
    offline: 7,
    activeAlerts: 4,
    criticalAlerts: 1,
    avgPowerKw: 42.6,
    peakPowerKw: 87.2,
    uptimePct: 99.42,
  };
}

export function mockTelemetrySeries(points = 60): Reading[] {
  const rnd = seeded(7);
  const now = Date.now();
  const out: Reading[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const drift = Math.sin(i / 6) * 4 + (rnd() - 0.5) * 3;
    const voltage = 230 + drift;
    const current = 18 + Math.sin(i / 9) * 3 + (rnd() - 0.5) * 1.5;
    const power = (voltage * current) / 1000;
    const temperature = 42 + Math.sin(i / 12) * 4 + (rnd() - 0.5) * 1.5;
    out.push({
      deviceId: "fleet-aggregate",
      timestamp: new Date(now - i * 5000).toISOString(),
      voltage,
      current,
      power,
      temperature,
    });
  }
  return out;
}

export function mockDevices(): Device[] {
  const rnd = seeded(41);
  return Array.from({ length: 24 }, (_, i) => {
    const online = rnd() > 0.15;
    return {
      deviceId: `dev-${1000 + i}`,
      name: `Substation ${String.fromCharCode(65 + i)}-${100 + i}`,
      ownerId: "org-1",
      firmwareVersion: rnd() > 0.6 ? "2.4.1" : rnd() > 0.5 ? "2.3.7" : "2.4.0",
      lastSeenAt: new Date(Date.now() - Math.floor(rnd() * 600_000)).toISOString(),
      online,
      createdAt: new Date(Date.now() - 86_400_000 * 30).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function mockAlerts(): Alert[] {
  const now = Date.now();
  return [
    {
      alertId: "al-1",
      deviceId: "dev-1003",
      type: "HIGH_TEMPERATURE",
      severity: "critical",
      message: "Temperature exceeded 78°C for 4 minutes",
      status: "active",
      createdAt: new Date(now - 4 * 60_000).toISOString(),
    },
    {
      alertId: "al-2",
      deviceId: "dev-1005",
      type: "HIGH_VOLTAGE",
      severity: "warning",
      message: "Voltage spike detected: 248V",
      status: "active",
      createdAt: new Date(now - 18 * 60_000).toISOString(),
    },
    {
      alertId: "al-3",
      deviceId: "dev-1001",
      type: "DEVICE_OFFLINE",
      severity: "warning",
      message: "No telemetry received for 6 minutes",
      status: "active",
      createdAt: new Date(now - 6 * 60_000).toISOString(),
    },
    {
      alertId: "al-4",
      deviceId: "dev-1007",
      type: "COMMUNICATION_TIMEOUT",
      severity: "warning",
      message: "MQTT keepalive missed 3 cycles",
      status: "active",
      createdAt: new Date(now - 42 * 60_000).toISOString(),
    },
  ];
}

export function mockAlertsExtended(): Alert[] {
  const now = Date.now();
  const base = mockAlerts();
  const resolved: Alert[] = [
    {
      alertId: "al-5",
      deviceId: "dev-1002",
      type: "LOW_VOLTAGE",
      severity: "warning",
      message: "Voltage dipped to 214V for 2 minutes",
      status: "resolved",
      createdAt: new Date(now - 3 * 3600_000).toISOString(),
      resolvedAt: new Date(now - 2.6 * 3600_000).toISOString(),
    },
    {
      alertId: "al-6",
      deviceId: "dev-1004",
      type: "HIGH_CURRENT",
      severity: "critical",
      message: "Current surge to 26.4A on phase B",
      status: "resolved",
      createdAt: new Date(now - 8 * 3600_000).toISOString(),
      resolvedAt: new Date(now - 7.9 * 3600_000).toISOString(),
    },
    {
      alertId: "al-7",
      deviceId: "dev-1006",
      type: "HIGH_TEMPERATURE",
      severity: "warning",
      message: "Temperature reached 66°C briefly",
      status: "resolved",
      createdAt: new Date(now - 26 * 3600_000).toISOString(),
      resolvedAt: new Date(now - 25.5 * 3600_000).toISOString(),
    },
  ];
  return [...base, ...resolved];
}

export function mockUsers(): User[] {
  const now = Date.now();
  const rows: Array<{
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    daysAgo: number;
    lastLoginMinsAgo?: number;
  }> = [
    { name: "Ada Okafor", email: "ada.okafor@voltra.io", role: "admin", isActive: true, daysAgo: 240, lastLoginMinsAgo: 12 },
    { name: "Marco Bianchi", email: "marco.bianchi@voltra.io", role: "engineer", isActive: true, daysAgo: 180, lastLoginMinsAgo: 47 },
    { name: "Priya Raman", email: "priya.raman@voltra.io", role: "engineer", isActive: true, daysAgo: 120, lastLoginMinsAgo: 3 },
    { name: "Sung-min Park", email: "sungmin.park@voltra.io", role: "engineer", isActive: true, daysAgo: 90, lastLoginMinsAgo: 210 },
    { name: "Elena Voss", email: "elena.voss@voltra.io", role: "viewer", isActive: true, daysAgo: 60, lastLoginMinsAgo: 1440 },
    { name: "Jamal Reid", email: "jamal.reid@voltra.io", role: "viewer", isActive: true, daysAgo: 45, lastLoginMinsAgo: 5400 },
    { name: "Isabelle Chen", email: "isabelle.chen@voltra.io", role: "viewer", isActive: false, daysAgo: 200 },
    { name: "Tobias Kraus", email: "tobias.kraus@voltra.io", role: "engineer", isActive: false, daysAgo: 300 },
  ];
  return rows.map((r, i) => ({
    userId: `usr-${2000 + i}`,
    email: r.email,
    name: r.name,
    role: r.role,
    isActive: r.isActive,
    profileImageUrl: null,
    createdAt: new Date(now - r.daysAgo * 86_400_000).toISOString(),
    updatedAt: new Date(now - 3_600_000).toISOString(),
    lastLoginAt: r.lastLoginMinsAgo
      ? new Date(now - r.lastLoginMinsAgo * 60_000).toISOString()
      : null,
  }));
}