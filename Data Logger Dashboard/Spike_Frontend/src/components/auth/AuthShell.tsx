import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-signal-healthy/15 border border-signal-healthy/30">
            <span className="h-2 w-2 rounded-full bg-signal-healthy shadow-[0_0_10px_theme(colors.signal-healthy)]" />
          </span>
          <span className="font-display text-sm font-semibold tracking-wide">VOLTRA</span>
        </Link>
        <Link
          to="/"
          className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          ← Back to site
        </Link>
      </header>

      <main className="flex-1 grid place-items-center px-4 py-8">
        <div className="w-full max-w-[400px]">
          <div className="rounded-xl border border-surface-stroke bg-surface-elevated p-8 ambient-shadow">
            {eyebrow ? (
              <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-signal-healthy/80">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-text-secondary">{subtitle}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="mt-5 text-center text-sm text-text-secondary">{footer}</div>
          ) : null}
        </div>
      </main>

      <footer className="px-6 py-5 text-center text-[11px] font-mono uppercase tracking-widest text-text-tertiary">
        Voltra · Encrypted transport · SOC-aligned
      </footer>
    </div>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-mono uppercase tracking-widest text-text-tertiary"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-signal-critical">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

export const authInputClass =
  "w-full rounded-md border border-surface-stroke bg-surface-base px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary/60 outline-none transition focus:border-signal-healthy focus:ring-1 focus:ring-signal-healthy/40";

export function PrimaryButton({
  children,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={
        "w-full rounded-md bg-signal-healthy px-4 py-2.5 text-sm font-semibold text-surface-base transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {loading ? "Working…" : children}
    </button>
  );
}

export function FormAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-signal-critical/40 bg-signal-critical/10 px-3 py-2 text-xs text-signal-critical">
      {message}
    </div>
  );
}

export function InfoAlert({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-signal-info/40 bg-signal-info/10 px-3 py-2 text-xs text-signal-info">
      {message}
    </div>
  );
}