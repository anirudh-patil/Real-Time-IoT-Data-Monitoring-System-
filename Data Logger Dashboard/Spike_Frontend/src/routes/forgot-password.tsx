import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { tokenStore } from "@/lib/auth/tokenStore";
import { authApi } from "@/lib/api/endpoints";
import { ApiError } from "@/lib/api/errors";
import {
  AuthShell,
  FormField,
  FormAlert,
  InfoAlert,
  PrimaryButton,
  authInputClass,
} from "@/components/auth/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: () => {
    if (tokenStore.isAuthenticated()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [{ title: "Reset password — Voltra" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({ email: z.string().email("Enter a valid email") });
type Values = z.infer<typeof schema>;

function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      await authApi.forgotPassword({ email: values.email });
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setFormError("The service is unavailable. Try again shortly.");
        return;
      }
      // Do not leak account existence for 4xx — always show success.
    }
    setSubmitted(true);
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      subtitle="We'll email a secure link to reset your Voltra password."
      footer={
        <Link to="/login" className="text-signal-healthy hover:underline">
          Back to sign in
        </Link>
      }
    >
      {submitted ? (
        <InfoAlert message="If an account exists for that email, a reset link is on its way. Check your inbox." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {formError ? <FormAlert message={formError} /> : null}
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={authInputClass}
              placeholder="you@company.com"
              {...register("email")}
            />
          </FormField>
          <PrimaryButton type="submit" loading={isSubmitting}>
            Send reset link
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}