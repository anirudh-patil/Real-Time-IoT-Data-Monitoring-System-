import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";

export function AppShell() {
  const { location, isLoading } = useRouterState({
    select: (s) => ({ location: s.location, isLoading: s.isLoading }),
  });

  return (
    <div className="min-h-screen w-full bg-surface-base text-text-primary flex">
      <SideNav />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        {/* Route-change progress bar */}
        <div className="relative h-[2px] bg-transparent">
          <div
            className={[
              "absolute inset-x-0 top-0 h-[2px] origin-left bg-signal-healthy transition-transform duration-500",
              isLoading ? "scale-x-100" : "scale-x-0",
            ].join(" ")}
          />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] p-6 md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}