import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: "default" | "healthy" | "warning" | "critical";
  icon?: ReactNode;
}

const toneMap = {
  default: "text-text-primary",
  healthy: "text-signal-healthy",
  warning: "text-signal-warning",
  critical: "text-signal-critical",
} as const;

export function KpiCard({ label, value, unit, hint, tone = "default", icon }: Props) {
  return (
    <div className="relative rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-text-tertiary">{label}</span>
        {icon ? <span className="text-text-tertiary">{icon}</span> : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`font-telemetry text-3xl leading-none ${toneMap[tone]}`}>{value}</span>
        {unit ? (
          <span className="text-xs text-text-tertiary uppercase tracking-widest">{unit}</span>
        ) : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-text-secondary">{hint}</div> : null}
    </div>
  );
}