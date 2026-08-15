import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell/AppShell";
import { tokenStore } from "@/lib/auth/tokenStore";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    if (!tokenStore.isAuthenticated()) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppShell,
});