import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Reading } from "@/lib/api/types";

type Metric = "voltage" | "current" | "power" | "temperature";

const META: Record<Metric, { label: string; unit: string; color: string }> = {
  voltage: { label: "Voltage", unit: "V", color: "var(--color-signal-healthy)" },
  current: { label: "Current", unit: "A", color: "var(--color-signal-info)" },
  power: { label: "Power", unit: "kW", color: "var(--color-signal-warning)" },
  temperature: { label: "Temperature", unit: "°C", color: "var(--color-signal-critical)" },
};

export function TelemetryChart({
  data,
  metric,
  height = 240,
}: {
  data: Reading[];
  metric: Metric;
  height?: number;
}) {
  const meta = META[metric];
  const shaped = useMemo(
    () =>
      data.map((r) => ({
        t: new Date(r.timestamp).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        value: Number(r[metric].toFixed(2)),
      })),
    [data, metric],
  );

  const gradientId = `grad-${metric}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={shaped} margin={{ top: 10, right: 10, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-surface-stroke)" strokeDasharray="3 6" vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
          axisLine={{ stroke: "var(--color-surface-stroke)" }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: "var(--color-text-tertiary)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={["dataMin - 2", "dataMax + 2"]}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-surface-stroke)",
            borderRadius: 8,
            fontFamily: "var(--font-telemetry)",
            fontSize: 12,
            color: "var(--color-text-primary)",
          }}
          labelStyle={{ color: "var(--color-text-tertiary)", fontSize: 10 }}
          formatter={(v: number) => [`${v} ${meta.unit}`, meta.label]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={meta.color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}