"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getActiveTranslator } from "@/i18n";
import { GradientButton } from "@/components/ui/gradient-button";

type AuthFormProps = {
  mode: "login" | "signup";
};

const isDev = process.env.NODE_ENV === "development";

async function parseErrorBody(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as { error?: unknown };
    return typeof data.error === "string" ? data.error : null;
  } catch {
    return null;
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const t = getActiveTranslator();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (isDev) {
      console.debug("[auth-form] submit start", { mode });
    }

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (isDev) {
        console.debug("[auth-form] API response", {
          mode,
          status: response.status,
          ok: response.ok,
        });
      }

      if (!response.ok) {
        if (response.status === 409) {
          setError(t("auth.form.errorEmailInUse"));
          return;
        }
        if (response.status === 401) {
          setError(t("auth.form.errorInvalidCredentials"));
          return;
        }
        if (response.status === 400) {
          const bodyHint = await parseErrorBody(response);
          if (bodyHint?.toLowerCase().includes("already")) {
            setError(t("auth.form.errorEmailInUse"));
            return;
          }
          setError(t("auth.form.errorInvalidInput"));
          return;
        }
        setError(t("auth.form.genericError"));
        return;
      }

      router.push("/animate");
      router.refresh();
    } catch {
      setError(t("auth.form.errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  const submittingLabel =
    mode === "login"
      ? t("auth.form.submittingLogin")
      : t("auth.form.submittingSignup");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-zinc-700">
        {t("auth.form.email")}
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={Boolean(error)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        {t("auth.form.password")}
        <input
          type="password"
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={mode === "signup" ? 8 : undefined}
          aria-invalid={Boolean(error)}
          className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <GradientButton
        type="submit"
        loading={loading}
        loadingLabel={submittingLabel}
        className="w-full"
      >
        {mode === "login" ? t("auth.login.cta") : t("auth.signup.cta")}
      </GradientButton>
    </form>
  );
}
