import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, ShieldCheck, User as UserIcon, Bell, Monitor } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { authApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  FormField,
  PrimaryButton,
  FormAlert,
  InfoAlert,
  authInputClass,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile & Settings — Voltra" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type Tab = "profile" | "security" | "preferences";

function ProfilePage() {
  const { user, role } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
          Account
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Profile &amp; Settings
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your account, credentials, and workspace preferences.
        </p>
      </header>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal-healthy/15 text-signal-healthy text-lg font-semibold">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-text-primary truncate">
            {user.name}
          </div>
          <div className="font-telemetry text-xs text-text-tertiary truncate">
            {user.email}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-surface-inset px-2.5 py-1 text-[10px] uppercase tracking-widest text-text-secondary">
            {role}
          </span>
          <span
            className={[
              "rounded-md px-2.5 py-1 text-[10px] uppercase tracking-widest",
              user.isActive
                ? "bg-signal-healthy/10 text-signal-healthy"
                : "bg-signal-critical/10 text-signal-critical",
            ].join(" ")}
          >
            {user.isActive ? "Active" : "Disabled"}
          </span>
        </div>
      </section>

      <div className="flex items-center gap-1 border-b border-surface-stroke">
        {(
          [
            { key: "profile", label: "Profile", icon: UserIcon },
            { key: "security", label: "Security", icon: ShieldCheck },
            { key: "preferences", label: "Preferences", icon: Monitor },
          ] as { key: Tab; label: string; icon: typeof UserIcon }[]
        ).map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs uppercase tracking-widest transition-colors",
                active
                  ? "border-signal-healthy text-text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-primary",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && <ProfilePanel />}
      {tab === "security" && <SecurityPanel />}
      {tab === "preferences" && <PreferencesPanel />}
    </div>
  );
}

function ProfilePanel() {
  const { user } = useAuth();
  if (!user) return null;
  const created = new Date(user.createdAt).toLocaleString();
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString()
    : "—";

  return (
    <section className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
      <header className="px-5 py-4 border-b border-surface-stroke">
        <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
          Identity
        </div>
        <div className="text-sm text-text-primary mt-0.5">Account details</div>
      </header>
      <dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-surface-stroke">
        <Field label="Full name" value={user.name} />
        <Field label="Email" value={user.email} mono />
      </dl>
      <dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-surface-stroke border-t border-surface-stroke">
        <Field label="User ID" value={user.userId} mono />
        <Field label="Role" value={user.role} />
      </dl>
      <dl className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-surface-stroke border-t border-surface-stroke">
        <Field label="Member since" value={created} mono />
        <Field label="Last sign in" value={lastLogin} mono />
      </dl>
      <div className="px-5 py-4 border-t border-surface-stroke text-xs text-text-tertiary">
        Editing name and email will be enabled once{" "}
        <span className="font-telemetry">PATCH /users/me</span> is wired.
      </div>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-[10px] uppercase tracking-widest text-text-tertiary">
        {label}
      </dt>
      <dd
        className={[
          "mt-1 text-sm text-text-primary break-all",
          mono ? "font-telemetry" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(10, "At least 10 characters")
      .regex(/[A-Z]/, "Needs an uppercase letter")
      .regex(/[a-z]/, "Needs a lowercase letter")
      .regex(/[0-9]/, "Needs a number"),
    confirm: z.string(),
  })
  .refine((d) => d.newPassword === d.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ["newPassword"],
    message: "New password must be different",
  });

type PasswordForm = z.infer<typeof passwordSchema>;

function SecurityPanel() {
  const { logout } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (data) => {
    setSubmitError(null);
    setSubmitOk(null);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSubmitOk("Password updated. Signing out for security…");
      reset();
      // Security rule: force reauth after password change.
      window.setTimeout(() => {
        logout();
      }, 1200);
    } catch (err) {
      if (err instanceof ApiError) setSubmitError(err.message);
      else setSubmitError("Could not update password.");
    }
  });

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
        <header className="px-5 py-4 border-b border-surface-stroke flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-signal-healthy" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
              Credentials
            </div>
            <div className="text-sm text-text-primary mt-0.5">Change password</div>
          </div>
        </header>
        <form onSubmit={onSubmit} className="p-5 space-y-4" noValidate>
          {submitError && <FormAlert message={submitError} />}
          {submitOk && <InfoAlert message={submitOk} />}
          <FormField
            label="Current password"
            htmlFor="currentPassword"
            error={errors.currentPassword?.message}
          >
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className={authInputClass}
              {...register("currentPassword")}
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="newPassword"
            error={errors.newPassword?.message}
            hint="Min 10 chars, mix of upper, lower, and numbers."
          >
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className={authInputClass}
              {...register("newPassword")}
            />
          </FormField>
          <FormField
            label="Confirm new password"
            htmlFor="confirm"
            error={errors.confirm?.message}
          >
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className={authInputClass}
              {...register("confirm")}
            />
          </FormField>
          <PrimaryButton type="submit" loading={isSubmitting}>
            Update password
          </PrimaryButton>
        </form>
      </div>
      <aside className="rounded-lg border border-surface-stroke bg-surface-elevated p-5 ambient-shadow space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
          Session policy
        </div>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex gap-2">
            <span className="text-signal-healthy">·</span>
            All active sessions sign out after a successful password change.
          </li>
          <li className="flex gap-2">
            <span className="text-signal-healthy">·</span>
            Access tokens rotate silently; refresh tokens are stored locally.
          </li>
          <li className="flex gap-2">
            <span className="text-signal-healthy">·</span>
            We never email your password. Reset links expire in 15 minutes.
          </li>
        </ul>
      </aside>
    </section>
  );
}

function PreferencesPanel() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
        <header className="px-5 py-4 border-b border-surface-stroke flex items-center gap-2">
          <Bell className="h-4 w-4 text-signal-warning" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
              Alerts
            </div>
            <div className="text-sm text-text-primary mt-0.5">Notifications</div>
          </div>
        </header>
        <div className="p-5 space-y-4">
          <Toggle
            label="Email me new alerts"
            description="Receive an email whenever a device raises a new alert."
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />
          <Toggle
            label="Critical severity only"
            description="Suppress warnings; only page me for critical incidents."
            checked={criticalOnly}
            onChange={setCriticalOnly}
          />
        </div>
      </div>
      <div className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow">
        <header className="px-5 py-4 border-b border-surface-stroke flex items-center gap-2">
          <Monitor className="h-4 w-4 text-signal-info" />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
              Display
            </div>
            <div className="text-sm text-text-primary mt-0.5">Units &amp; theme</div>
          </div>
        </header>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">
              Temperature
            </div>
            <div className="inline-flex rounded-md bg-surface-inset p-1">
              {(["C", "F"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setTempUnit(u)}
                  className={[
                    "rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
                    tempUnit === u
                      ? "bg-surface-elevated text-text-primary"
                      : "text-text-tertiary hover:text-text-primary",
                  ].join(" ")}
                >
                  °{u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary mb-2">
              Theme
            </div>
            <div className="text-sm text-text-secondary">
              Dark (industrial) — locked in this build.
            </div>
          </div>
        </div>
      </div>
      <p className="lg:col-span-2 text-xs text-text-tertiary">
        Preferences are local-only until{" "}
        <span className="font-telemetry">PATCH /users/me/preferences</span> is wired.
      </p>
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer">
      <span className="flex-1">
        <span className="block text-sm text-text-primary">{label}</span>
        <span className="block text-xs text-text-tertiary mt-0.5">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-signal-healthy/70" : "bg-surface-inset",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-surface-elevated shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </label>
  );
}