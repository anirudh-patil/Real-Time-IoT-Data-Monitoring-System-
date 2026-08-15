import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MoreHorizontal,
  Search,
  Shield,
  UserPlus,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { tokenStore } from "@/lib/auth/tokenStore";
import { mockUsers } from "@/lib/mock/telemetry";
import type { Role, User } from "@/lib/api/types";
import {
  FormField,
  PrimaryButton,
  FormAlert,
  InfoAlert,
  authInputClass,
} from "@/components/auth/AuthShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: () => {
    const user = tokenStore.getUser();
    if (!user || user.role !== "admin") {
      throw redirect({ to: "/forbidden" });
    }
  },
  head: () => ({
    meta: [
      { title: "Users — Voltra admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminUsersPage,
});

type RoleFilter = "all" | Role;
type StatusFilter = "all" | "active" | "disabled";

function AdminUsersPage() {
  const seed = useMemo(() => mockUsers(), []);
  const [users, setUsers] = useState<User[]>(seed);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (role !== "all" && u.role !== role) return false;
    if (status === "active" && !u.isActive) return false;
    if (status === "disabled" && u.isActive) return false;
    if (q) {
      const n = q.toLowerCase();
      if (!u.name.toLowerCase().includes(n) && !u.email.toLowerCase().includes(n))
        return false;
    }
    return true;
  });

  const counts = {
    admin: users.filter((u) => u.role === "admin").length,
    engineer: users.filter((u) => u.role === "engineer").length,
    viewer: users.filter((u) => u.role === "viewer").length,
    disabled: users.filter((u) => !u.isActive).length,
  };

  function toggleActive(u: User) {
    setUsers((prev) =>
      prev.map((p) => (p.userId === u.userId ? { ...p, isActive: !p.isActive } : p)),
    );
    setNotice(
      `${u.name} ${u.isActive ? "disabled" : "reactivated"} (local only — backend not wired).`,
    );
  }

  function changeRole(u: User, nextRole: Role) {
    if (u.role === nextRole) return;
    setUsers((prev) =>
      prev.map((p) => (p.userId === u.userId ? { ...p, role: nextRole } : p)),
    );
    setNotice(`${u.name} → ${nextRole} (local only).`);
  }

  function onInvited(next: User) {
    setUsers((prev) => [next, ...prev]);
    setInviteOpen(false);
    setNotice(`Invitation queued for ${next.email} (local only).`);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-text-tertiary">
            Admin
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Users</h1>
          <p className="text-sm text-text-secondary mt-1">
            <span className="font-telemetry">{counts.admin}</span> admin ·{" "}
            <span className="font-telemetry">{counts.engineer}</span> engineer ·{" "}
            <span className="font-telemetry">{counts.viewer}</span> viewer ·{" "}
            <span className="font-telemetry">{counts.disabled}</span> disabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email"
              className="w-72 rounded-md border border-surface-stroke bg-surface-elevated pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-signal-healthy/60"
            />
          </div>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-signal-healthy px-3 py-2 text-xs uppercase tracking-widest font-semibold text-surface-base hover:brightness-110"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite user
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label="Role"
          value={role}
          options={[
            { key: "all", label: "All" },
            { key: "admin", label: "Admin" },
            { key: "engineer", label: "Engineer" },
            { key: "viewer", label: "Viewer" },
          ]}
          onChange={(v) => setRole(v as RoleFilter)}
        />
        <FilterPill
          label="Status"
          value={status}
          options={[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "disabled", label: "Disabled" },
          ]}
          onChange={(v) => setStatus(v as StatusFilter)}
        />
      </div>

      {notice && (
        <div className="rounded-md border border-signal-info/40 bg-signal-info/10 px-3 py-2 text-xs text-signal-info flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-signal-info/80 hover:text-signal-info"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated ambient-shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-inset/40">
            <tr className="text-left text-[10px] uppercase tracking-widest text-text-tertiary">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Last sign in</th>
              <th className="px-5 py-3 font-medium">Member since</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-stroke">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface-inset text-text-tertiary">
                    <UsersIcon className="h-5 w-5" />
                  </span>
                  <div className="mt-3 text-sm text-text-secondary">
                    No users match this view.
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <UserRow
                  key={u.userId}
                  user={u}
                  onToggleActive={() => toggleActive(u)}
                  onChangeRole={(r) => changeRole(u, r)}
                />
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-surface-stroke bg-surface-elevated p-4 ambient-shadow flex items-center gap-3 text-xs text-text-secondary">
        <Shield className="h-3.5 w-3.5 text-text-tertiary" />
        Role changes and deactivation are local only until{" "}
        <span className="font-telemetry">PATCH /users/:id</span> and{" "}
        <span className="font-telemetry">POST /users/invite</span> are wired.
      </section>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} onInvited={onInvited} />}
    </div>
  );
}

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-surface-inset p-1">
      <span className="pl-2 pr-1 text-[10px] uppercase tracking-widest text-text-tertiary">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={[
            "rounded px-3 py-1.5 text-xs uppercase tracking-widest transition-colors",
            value === o.key
              ? "bg-surface-elevated text-text-primary"
              : "text-text-tertiary hover:text-text-primary",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function UserRow({
  user,
  onToggleActive,
  onChangeRole,
}: {
  user: User;
  onToggleActive: () => void;
  onChangeRole: (r: Role) => void;
}) {
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const last = user.lastLoginAt ? relativeTime(user.lastLoginAt) : "Never";
  const since = new Date(user.createdAt).toLocaleDateString();

  return (
    <tr className="hover:bg-surface-inset/30">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-healthy/15 text-signal-healthy text-[11px] font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm text-text-primary truncate">{user.name}</div>
            <div className="font-telemetry text-xs text-text-tertiary truncate">
              {user.email}
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="rounded-md bg-surface-inset px-2 py-1 text-[10px] uppercase tracking-widest text-text-secondary">
          {user.role}
        </span>
      </td>
      <td className="px-5 py-3">
        <span
          className={[
            "inline-flex items-center gap-1.5 text-[11px]",
            user.isActive ? "text-signal-healthy" : "text-text-tertiary",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              user.isActive ? "bg-signal-healthy" : "bg-text-tertiary",
            ].join(" ")}
          />
          {user.isActive ? "Active" : "Disabled"}
        </span>
      </td>
      <td className="px-5 py-3 font-telemetry text-xs text-text-secondary">{last}</td>
      <td className="px-5 py-3 font-telemetry text-xs text-text-secondary">{since}</td>
      <td className="px-5 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-inset hover:text-text-primary">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-text-tertiary text-[10px] uppercase tracking-widest">
              Change role
            </DropdownMenuLabel>
            {(["admin", "engineer", "viewer"] as Role[]).map((r) => (
              <DropdownMenuItem
                key={r}
                onSelect={() => onChangeRole(r)}
                disabled={r === user.role}
                className="capitalize"
              >
                {r}
                {r === user.role && (
                  <span className="ml-auto text-[10px] uppercase text-text-tertiary">
                    current
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onToggleActive}
              className={user.isActive ? "text-signal-critical focus:text-signal-critical" : ""}
            >
              {user.isActive ? "Deactivate account" : "Reactivate account"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

const inviteSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "engineer", "viewer"]),
});
type InviteForm = z.infer<typeof inviteSchema>;

function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: (u: User) => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "viewer" },
  });

  const onSubmit = handleSubmit((data) => {
    setErr(null);
    // Local-only simulation until POST /users/invite is wired.
    const now = new Date().toISOString();
    onInvited({
      userId: `usr-invite-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: true,
      profileImageUrl: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-surface-stroke bg-surface-elevated p-6 ambient-shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-signal-healthy/80">
              Access control
            </div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-text-primary">
              Invite a user
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              They'll receive an email to set their password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-tertiary hover:bg-surface-inset hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-5 space-y-4">
          {err && <FormAlert message={err} />}
          <InfoAlert message="Local-only preview: no email will be sent." />
          <FormField label="Full name" htmlFor="invite-name" error={errors.name?.message}>
            <input
              id="invite-name"
              type="text"
              className={authInputClass}
              autoComplete="off"
              {...register("name")}
            />
          </FormField>
          <FormField label="Email" htmlFor="invite-email" error={errors.email?.message}>
            <input
              id="invite-email"
              type="email"
              className={authInputClass}
              autoComplete="off"
              {...register("email")}
            />
          </FormField>
          <FormField label="Role" htmlFor="invite-role" error={errors.role?.message}>
            <select id="invite-role" className={authInputClass} {...register("role")}>
              <option value="viewer">Viewer — read only</option>
              <option value="engineer">Engineer — operate devices</option>
              <option value="admin">Admin — full access</option>
            </select>
          </FormField>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-surface-stroke bg-surface-inset px-3 py-2 text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" loading={isSubmitting}>
              Send invitation
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  );
}