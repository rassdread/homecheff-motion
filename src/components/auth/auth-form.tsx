"use client";

import { FormEvent, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { invalidateAuthSessionCache } from "@/lib/auth-session-client";
import { GradientButton } from "@/components/ui/gradient-button";

type AuthFormProps = {
  mode: "login" | "signup";
  /** Required for signup when the server expects an invite (ignored for login). */
  inviteToken?: string;
};

import { resolvePostAuthRedirectFromSearch, DEFAULT_POST_AUTH_PATH } from "@/lib/auth-post-auth-redirect";

const isDev = process.env.NODE_ENV === "development";

function resolvePostAuthRedirect(): string {
  if (typeof window === "undefined") {
    return DEFAULT_POST_AUTH_PATH;
  }
  return resolvePostAuthRedirectFromSearch(window.location.search);
}

async function parseErrorJson(
  response: Response
): Promise<{ error?: string; code?: string }> {
  try {
    return (await response.json()) as { error?: string; code?: string };
  } catch {
    return {};
  }
}

export function AuthForm({ mode, inviteToken = "" }: AuthFormProps) {
  const t = useActiveTranslator();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const body =
        mode === "signup"
          ? { email, password, inviteToken: inviteToken.trim() || undefined }
          : { email, password };

      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        mode: "same-origin",
        cache: "no-store",
        body: JSON.stringify(body),
      });

      if (isDev) {
        console.debug("[auth-form] API response", {
          mode,
          status: response.status,
          ok: response.ok,
        });
      }

      if (!response.ok) {
        const errJson = await parseErrorJson(response);
        const code = errJson.code;

        if (mode === "signup") {
          if (code === "INVITE_REQUIRED") {
            setError(t("auth.signup.inviteRequiredBody"));
            return;
          }
          if (code === "INVITE_INVALID") {
            setError(t("auth.signup.inviteInvalid"));
            return;
          }
          if (code === "INVITE_EMAIL_MISMATCH") {
            setError(t("auth.signup.inviteEmailMismatch"));
            return;
          }
        }

        if (response.status === 409) {
          setError(t("auth.form.errorEmailInUse"));
          return;
        }
        if (response.status === 403 && errJson.code === "USER_INACTIVE") {
          setError(t("animate.auth.inactiveAccount"));
          return;
        }
        if (response.status === 401) {
          setError(t("auth.form.errorInvalidCredentials"));
          return;
        }
        if (response.status === 400) {
          const bodyHint = errJson.error ?? "";
          if (bodyHint.toLowerCase().includes("already")) {
            setError(t("auth.form.errorEmailInUse"));
            return;
          }
          setError(t("auth.form.errorInvalidInput"));
          return;
        }
        setError(t("auth.form.genericError"));
        return;
      }

      invalidateAuthSessionCache();
      // Full navigation so the browser reliably applies Set-Cookie before the next request.
      window.location.assign(resolvePostAuthRedirect());
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
      <div className="block text-sm font-medium text-zinc-700">
        <span className="block">{t("auth.form.password")}</span>
        <div className="relative mt-1">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 8 : undefined}
            aria-invalid={Boolean(error)}
            className="block w-full rounded-lg border border-zinc-300 py-2 pl-3 pr-11 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-pressed={showPassword}
            aria-label={showPassword ? t("auth.form.hidePassword") : t("auth.form.showPassword")}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 5 12 5c4.638 0 8.573 2.51 9.964 6.322.05.174.05.36 0 .534C20.577 16.49 16.64 19 12 19c-4.638 0-8.573-2.51-9.964-6.322zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
      {mode === "signup" && inviteToken ? (
        <input type="hidden" name="inviteToken" value={inviteToken} readOnly />
      ) : null}
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
