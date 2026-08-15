import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Cpu, Gauge, Radio, ShieldCheck, Zap } from "lucide-react";
import { ClientOnly } from "@/components/marketing/ClientOnly";

const HeroCanvas = lazy(() => import("@/components/marketing/HeroCanvas"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Voltra — Live energy telemetry for real infrastructure" },
      {
        name: "description",
        content:
          "Voltra is an IoT energy monitoring platform: live voltage, current, and temperature from your fleet, with instant alerts when something moves.",
      },
      { property: "og:title", content: "Voltra — Live energy telemetry" },
      {
        property: "og:description",
        content:
          "Watch every device in your fleet in real time. Fleet management, alerts, and telemetry — built for operations teams.",
      },
    ],
  }),
  component: Marketing,
});

function Marketing() {
  return (
    <div className="dark min-h-screen bg-surface-base text-text-primary antialiased">
      <MarketingHeader />
      <Hero />
      <SignalStrip />
      <Capabilities />
      <TelemetryPreview />
      <RolesBand />
      <FinalCta />
      <MarketingFooter />
    </div>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-stroke/70 bg-surface-base/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-sm bg-signal-healthy/15 text-signal-healthy">
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Voltra</span>
          <span className="ml-2 hidden font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary sm:inline">
            v1.0 · telemetry
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-text-secondary md:flex">
          <a href="#capabilities" className="hover:text-text-primary">Capabilities</a>
          <a href="#telemetry" className="hover:text-text-primary">Telemetry</a>
          <a href="#roles" className="hover:text-text-primary">Roles</a>
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <Link
            to="/login"
            className="rounded-md px-3 py-1.5 text-text-secondary hover:text-text-primary"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:brightness-110"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-surface-stroke">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          background:
            "radial-gradient(60% 55% at 70% 40%, color-mix(in oklab, var(--color-signal-healthy) 22%, transparent) 0%, transparent 70%), radial-gradient(50% 40% at 15% 90%, color-mix(in oklab, var(--color-signal-info) 15%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-surface-stroke) 1px, transparent 1px), linear-gradient(90deg, var(--color-surface-stroke) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-24 pt-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col justify-center"
        >
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-surface-stroke bg-surface-elevated/60 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-text-secondary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-signal-healthy/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal-healthy" />
            </span>
            Live fleet · 128 devices reporting
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-text-primary md:text-6xl">
            Energy telemetry <br />
            <span className="text-signal-healthy">at the speed</span> <br />
            <span className="text-text-secondary">of the grid.</span>
          </h1>
          <p className="mt-6 max-w-md text-pretty text-text-secondary">
            Voltra streams voltage, current, and thermal signals from every device in
            your fleet. Sub-second alerts, engineer-grade dashboards, and a role model
            built for operations teams — not marketing decks.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-md bg-signal-healthy px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
            >
              Start monitoring
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-md border border-surface-stroke px-4 py-2.5 text-sm text-text-primary hover:bg-surface-elevated"
            >
              Sign in
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-surface-stroke pt-6 max-w-md">
            {[
              { k: "Ingest", v: "12k pts/s" },
              { k: "Latency", v: "< 800ms" },
              { k: "Uptime", v: "99.98%" },
            ].map((s) => (
              <div key={s.k}>
                <dt className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                  {s.k}
                </dt>
                <dd className="mt-1 font-telemetry text-lg text-text-primary">{s.v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="relative aspect-square w-full self-center rounded-2xl border border-surface-stroke bg-surface-elevated/40 ambient-shadow"
        >
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <ClientOnly fallback={<CanvasFallback />}>
              <Suspense fallback={<CanvasFallback />}>
                <HeroCanvas />
              </Suspense>
            </ClientOnly>
          </div>
          <HeroOverlay />
        </motion.div>
      </div>
    </section>
  );
}

function CanvasFallback() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-signal-healthy/10" />
    </div>
  );
}

function HeroOverlay() {
  return (
    <>
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-md border border-surface-stroke bg-surface-inset/80 px-2.5 py-1 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-signal-healthy" />
        <span className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-secondary">
          fleet · nominal
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-md border border-surface-stroke bg-surface-inset/80 px-3 py-2 backdrop-blur">
        <div className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
          avg voltage
        </div>
        <div className="font-telemetry text-lg text-text-primary">
          229.4 <span className="text-xs text-text-tertiary">V</span>
        </div>
      </div>
    </>
  );
}

function SignalStrip() {
  const items = [
    { label: "voltage", val: "229.4 V", tone: "text-signal-healthy" },
    { label: "current", val: "14.02 A", tone: "text-signal-healthy" },
    { label: "temp", val: "62.1 °C", tone: "text-signal-warning" },
    { label: "pf", val: "0.98", tone: "text-signal-healthy" },
    { label: "faults 24h", val: "3", tone: "text-signal-critical" },
    { label: "devices", val: "128 / 128", tone: "text-signal-info" },
  ];
  return (
    <section aria-hidden className="border-b border-surface-stroke bg-surface-inset/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden px-0 sm:grid-cols-3 md:grid-cols-6">
        {items.map((it) => (
          <div key={it.label} className="bg-surface-base px-5 py-4">
            <div className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {it.label}
            </div>
            <div className={`mt-1 font-telemetry text-base ${it.tone}`}>{it.val}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Capabilities() {
  const items = [
    {
      icon: Activity,
      title: "Sub-second streams",
      body: "Every reading is streamed over Socket.IO. No polling, no refresh loops — the number on screen is the number on the wire.",
    },
    {
      icon: AlertTriangle,
      title: "Alerts that mean something",
      body: "Thresholds per device, severity-scoped acknowledgement, and audit trails. Noise is a bug, not a feature.",
    },
    {
      icon: Cpu,
      title: "Fleet-first data model",
      body: "Devices, sites, and roles are first-class. Cursor-paginated everywhere. Nothing you build against will silently break.",
    },
    {
      icon: ShieldCheck,
      title: "Roles, not toggles",
      body: "Admin, engineer, viewer — gated at the route, the API, and the UI. No permission implied by URL length.",
    },
  ];
  return (
    <section id="capabilities" className="border-b border-surface-stroke">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionKicker>03 · Capabilities</SectionKicker>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Built for the console that runs a shift, not the deck that closes a round.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-surface-stroke bg-surface-stroke sm:grid-cols-2">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface-elevated p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-signal-healthy/10 text-signal-healthy">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              </div>
              <p className="mt-3 text-sm text-text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TelemetryPreview() {
  return (
    <section id="telemetry" className="border-b border-surface-stroke">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="flex flex-col justify-center">
          <SectionKicker>04 · Telemetry</SectionKicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            The reading, the range, the reason.
          </h2>
          <p className="mt-4 max-w-md text-text-secondary">
            Every metric on the dashboard carries its context: the live value, the 24h
            envelope, and the last event that moved it. Nothing floats.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-text-secondary">
            {[
              [Radio, "Live subscribe per device — only the panels you're watching."],
              [Gauge, "Deterministic thresholds. No mystery ML in the alert path."],
              [Activity, "Recharts + tabular-num monospace so numbers stop shifting."],
            ].map(([Icon, text], i) => {
              const IconComp = Icon as typeof Radio;
              return (
                <li key={i} className="flex items-start gap-3">
                  <IconComp className="mt-0.5 h-4 w-4 text-signal-healthy" />
                  <span>{text as string}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <TelemetryMock />
      </div>
    </section>
  );
}

function TelemetryMock() {
  // Static SVG sparkline — no data fetching, this is marketing.
  const points = [8, 12, 10, 14, 13, 17, 16, 20, 18, 22, 21, 24, 22, 26, 24, 28, 27, 30, 28, 31];
  const w = 560;
  const h = 140;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / (max - min)) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="rounded-xl border border-surface-stroke bg-surface-elevated/60 p-5 ambient-shadow">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            device · IX-4207 · voltage
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-telemetry text-3xl text-text-primary">231.6</span>
            <span className="font-telemetry text-xs text-text-tertiary">V</span>
            <span className="ml-2 rounded-sm bg-signal-healthy/15 px-1.5 py-0.5 font-telemetry text-[10px] uppercase tracking-[0.16em] text-signal-healthy">
              nominal
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
            24h Δ
          </div>
          <div className="mt-1 font-telemetry text-sm text-signal-healthy">+0.42%</div>
        </div>
      </div>
      <div className="mt-5 rounded-md border border-surface-stroke bg-surface-inset/60 p-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
          <defs>
            <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-signal-healthy)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--color-signal-healthy)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#spark)" />
          <path d={d} fill="none" stroke="var(--color-signal-healthy)" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-surface-stroke pt-4">
        {[
          ["min 24h", "224.1 V"],
          ["max 24h", "233.9 V"],
          ["samples", "17,204"],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="font-telemetry text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {k}
            </div>
            <div className="mt-1 font-telemetry text-sm text-text-primary">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RolesBand() {
  const roles = [
    { name: "Viewer", scope: "Read fleet · read alerts", tone: "text-signal-info" },
    { name: "Engineer", scope: "+ acknowledge · configure thresholds", tone: "text-signal-healthy" },
    { name: "Admin", scope: "+ users · devices · billing", tone: "text-signal-warning" },
  ];
  return (
    <section id="roles" className="border-b border-surface-stroke bg-surface-inset/40">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <SectionKicker>05 · Roles</SectionKicker>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Three roles. Enforced at the route, the API, and the UI.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <div
              key={r.name}
              className="rounded-lg border border-surface-stroke bg-surface-elevated p-5"
            >
              <div className={`font-telemetry text-[10px] uppercase tracking-[0.18em] ${r.tone}`}>
                role · {r.name.toLowerCase()}
              </div>
              <div className="mt-2 text-lg font-semibold tracking-tight">{r.name}</div>
              <div className="mt-2 text-sm text-text-secondary">{r.scope}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="border-b border-surface-stroke">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          Bring your fleet online in an afternoon.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-text-secondary">
          Provision a device, point it at Voltra, and watch the numbers arrive. No sales
          call. No trial gate on the good features.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/register"
            className="rounded-md bg-signal-healthy px-5 py-2.5 text-sm font-medium text-black hover:brightness-110"
          >
            Create an account
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-surface-stroke px-5 py-2.5 text-sm hover:bg-surface-elevated"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 py-10 text-xs text-text-tertiary md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded-sm bg-signal-healthy/15 text-signal-healthy">
          <Zap className="h-3 w-3" strokeWidth={2.5} />
        </span>
        <span>© {new Date().getUTCFullYear()} Voltra · Built for operations</span>
      </div>
      <div className="font-telemetry uppercase tracking-[0.18em]">
        status: <span className="text-signal-healthy">all systems nominal</span>
      </div>
    </footer>
  );
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-telemetry text-[10px] uppercase tracking-[0.22em] text-signal-healthy">
      {children}
    </div>
  );
}
