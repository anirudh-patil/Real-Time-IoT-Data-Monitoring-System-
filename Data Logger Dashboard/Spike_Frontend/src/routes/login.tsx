import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth/useAuth";
import { ApiError } from "@/lib/api/errors";
import { tokenStore } from "@/lib/auth/tokenStore";
import {
  AuthShell,
  FormField,
  FormAlert,
  PrimaryButton,
  authInputClass,
} from "@/components/auth/AuthShell";

const searchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: ({ search }) => {
    if (tokenStore.isAuthenticated()) {
      throw redirect({ to: (search as { redirect?: string }).redirect ?? "/dashboard" });
    }
  },
  head: () => ({ meta: [{ title: "Sign in — Voltra" }, { name: "robots", content: "noindex" }] }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const search = Route.useSearch();
  const auth = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Warm the dashboard route (code-split chunk + loader) while the user is
  // typing credentials, so the first post-auth render usually skips the
  // pending skeleton.
  useEffect(() => {
    const target = (search.redirect as string | undefined) ?? "/dashboard";
    void router.preloadRoute({ to: target }).catch(() => {});
  }, [router, search.redirect]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await auth.login(values.email, values.password);
      const target = (search.redirect as string | undefined) ?? "/dashboard";
      // Preload again post-auth so any authenticated loaders/queries run
      // with the fresh token before we navigate.
      await router.preloadRoute({ to: target }).catch(() => {});
      navigate({ to: target });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(
          err.status === 401 || err.status === 400
            ? "Invalid email or password."
            : err.message,
        );
      } else {
        setFormError("Could not reach the server. Try again in a moment.");
      }
    }
  }

  return (
    <AuthShell
      eyebrow="Secure sign-in"
      title="Sign in to Voltra"
      subtitle="Enter your credentials to reach the operational console."
      footer={
        <>
          No account?{" "}
          <Link to="/register" className="text-signal-healthy hover:underline">
            Request access
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError ? <FormAlert message={formError} /> : null}

        <FormField label="Email" htmlFor="email" error={errors.email?.message}>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={authInputClass + " pl-9"}
              placeholder="you@company.com"
              {...register("email")}
            />
          </div>
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className={authInputClass + " pl-9 pr-9"}
              placeholder="••••••••"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-tertiary hover:text-text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormField>

        <div className="flex items-center justify-end -mt-1">
          <Link
            to="/forgot-password"
            className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <PrimaryButton type="submit" loading={isSubmitting}>
          <span className="inline-flex items-center justify-center gap-2">
            <LogIn className="h-4 w-4" />
            Sign in
          </span>
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}