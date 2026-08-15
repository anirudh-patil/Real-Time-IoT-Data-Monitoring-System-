import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { authApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import { tokenStore } from "@/lib/auth/tokenStore";
import {
  AuthShell,
  FormField,
  FormAlert,
  PrimaryButton,
  authInputClass,
} from "@/components/auth/AuthShell";

const searchSchema = z.object({ token: z.string().optional() });

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Set new password — Voltra" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
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

type Values = z.infer<typeof schema>;

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  async function onSubmit(values: Values) {
    setFormError(null);
    if (!token) {
      setFormError("This reset link is missing its token. Request a new one.");
      return;
    }
    try {
      await authApi.resetPassword({ token, newPassword: values.password });
      tokenStore.clear();
      toast.success("Password updated. Sign in with your new password.");
      navigate({ to: "/login" });
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(
          err.status === 400 || err.status === 410
            ? "This reset link is invalid or has expired. Request a new one."
            : err.message,
        );
      } else {
        setFormError("Could not reach the server. Try again in a moment.");
      }
    }
  }

  return (
    <AuthShell
      eyebrow="New password"
      title="Set a new password"
      subtitle="Choose a strong password you haven't used before."
      footer={
        <Link to="/login" className="text-signal-healthy hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!token ? (
        <FormAlert message="This reset link is missing its token. Request a new one from the forgot-password page." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError ? <FormAlert message={formError} /> : null}
          <FormField
            label="New password"
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
            Update password
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}