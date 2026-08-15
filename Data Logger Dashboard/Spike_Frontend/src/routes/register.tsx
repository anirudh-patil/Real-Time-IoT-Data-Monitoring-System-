import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { tokenStore } from "@/lib/auth/tokenStore";
import { useAuth } from "@/lib/auth/useAuth";
import { ApiError } from "@/lib/api/errors";
import {
  AuthShell,
  FormField,
  FormAlert,
  PrimaryButton,
  authInputClass,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (tokenStore.isAuthenticated()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [{ title: "Create account — Voltra" }, { name: "robots", content: "noindex" }],
  }),
  component: RegisterPage,
});

const registerSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/[0-9]/, "Must include a number"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  });

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      await auth.register(values.name, values.email, values.password);
      toast.success("Account created. Sign in to continue.");
      navigate({ to: "/login" });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(
          err.status === 409
            ? "An account with this email already exists."
            : err.message,
        );
      } else {
        setFormError("Could not reach the server. Try again in a moment.");
      }
    }
  }

  return (
    <AuthShell
      eyebrow="Request access"
      title="Create your Voltra account"
      subtitle="Access to the operational console requires an approved account."
      footer={
        <>
          Already onboarded?{" "}
          <Link to="/login" className="text-signal-healthy hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError ? <FormAlert message={formError} /> : null}

        <FormField label="Full name" htmlFor="name" error={errors.name?.message}>
          <input
            id="name"
            autoComplete="name"
            className={authInputClass}
            placeholder="Alex Rivera"
            {...register("name")}
          />
        </FormField>

        <FormField label="Work email" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={authInputClass}
            placeholder="you@company.com"
            {...register("email")}
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="Min 10 chars, mixed case, and a number."
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            placeholder="••••••••••"
            {...register("password")}
          />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirm"
          error={errors.confirm?.message}
        >
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            className={authInputClass}
            placeholder="••••••••••"
            {...register("confirm")}
          />
        </FormField>

        <PrimaryButton type="submit" loading={isSubmitting}>
          Create account
        </PrimaryButton>
      </form>
    </AuthShell>
  );
}