import { QueryClient } from "@tanstack/react-query";
import { createRouter, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { routeTree } from "./routeTree.gen";
import { reportLovableError } from "./lib/lovable-error-reporting";
import { PageSkeleton } from "./components/loading/PageSkeleton";

function DefaultPending() {
  // Router defaults gate this behind `pendingMs: 1000` — so on fast
  // connections it never renders. Slow loads get a real content-shaped
  // skeleton instead of a spinner.
  return <PageSkeleton />;
}

function DefaultError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "router_default_error" });
  }, [error]);
  return (
    <div className="mx-auto max-w-md rounded-lg border border-signal-critical/30 bg-signal-critical/5 p-6 text-center">
      <div className="text-[10px] uppercase tracking-widest text-signal-critical">Error</div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-text-primary">
        This view didn't load
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-md bg-signal-healthy px-3 py-2 text-xs uppercase tracking-widest font-semibold text-surface-base hover:brightness-110"
        >
          Try again
        </button>
        <Link
          to="/dashboard"
          className="rounded-md border border-surface-stroke bg-surface-inset px-3 py-2 text-xs uppercase tracking-widest text-text-secondary hover:text-text-primary"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: DefaultPending,
    defaultErrorComponent: DefaultError,
  });

  return router;
};
