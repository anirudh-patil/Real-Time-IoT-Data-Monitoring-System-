import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/forbidden")({
  head: () => ({ meta: [{ title: "Forbidden — Voltra" }, { name: "robots", content: "noindex" }] }),
  component: Forbidden,
});

function Forbidden() {
  return (
    <div className="dark min-h-screen bg-surface-base text-text-primary flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="text-6xl font-telemetry text-signal-critical">403</div>
        <h1 className="mt-4 text-xl font-semibold">You don't have access to this area</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Your role isn't cleared for this page. If you think this is wrong, ask an administrator to
          adjust your permissions.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-md border border-surface-stroke px-4 py-2 text-sm hover:bg-surface-elevated"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}