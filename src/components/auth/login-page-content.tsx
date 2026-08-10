"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { homecheffForgotPasswordHref } from "@/lib/identity/homecheff-origin";

type Props = {
  ssoEnabled: boolean;
  legacyEnabled: boolean;
  returnTo: string;
};

/**
 * SP.2B.1 — Native Studio login presentation.
 * Backend remains HomeCheff IdP via /auth/sso/start (no Studio Google OAuth).
 */
export function LoginPageContent({ ssoEnabled, legacyEnabled, returnTo }: Props) {
  const t = useActiveTranslator();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"google" | "password" | null>(null);

  const ssoBase = `/auth/sso/start?returnTo=${encodeURIComponent(returnTo)}`;

  function startGoogle() {
    setBusy("google");
    window.location.assign(`${ssoBase}&intent=google`);
  }

  function startPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ssoEnabled) return;
    setBusy("password");
    const hint = email.trim();
    const qs = hint ? `&email=${encodeURIComponent(hint)}&intent=password` : `&intent=password`;
    // Password is entered on Studio for UX; validation happens on HomeCheff IdP.
    // We do not POST the password to Studio (no credential API / no duplicate IdP).
    void password;
    window.location.assign(`${ssoBase}${qs}`);
  }

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <p className="text-sm font-semibold tracking-wide text-emerald-800">
            {t("auth.login.brandStudio")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{t("auth.login.welcomeBack")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("auth.login.nativeSubtitle")}</p>

          {ssoEnabled ? (
            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={startGoogle}
                disabled={busy !== null}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              >
                <GoogleMark />
                {busy === "google" ? t("auth.login.continuing") : t("auth.login.continueGoogle")}
              </button>

              <div className="relative py-1 text-center text-xs font-medium uppercase tracking-wide text-zinc-400">
                <span className="relative z-10 bg-white px-2">{t("auth.login.or")}</span>
                <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-zinc-200" />
              </div>

              <form onSubmit={startPassword} className="space-y-3">
                <label className="block text-sm text-zinc-700">
                  <span className="mb-1 block">{t("auth.form.email")}</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm text-zinc-700">
                  <span className="mb-1 block">{t("auth.form.password")}</span>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 px-3 py-2 pr-16 text-sm"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 text-xs text-zinc-500"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? t("auth.form.hidePassword") : t("auth.form.showPassword")}
                    </button>
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={busy !== null}
                  className="flex w-full items-center justify-center rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {busy === "password" ? t("auth.login.continuing") : t("auth.login.cta")}
                </button>
              </form>

              <p className="text-sm text-zinc-600">
                <a
                  href={homecheffForgotPasswordHref()}
                  className="text-emerald-700 underline"
                >
                  {t("auth.login.forgotPassword")}
                </a>
              </p>

              <p className="text-sm text-zinc-600">
                {t("auth.login.noAccount")}{" "}
                <Link
                  href={`/signup?next=${encodeURIComponent(returnTo)}`}
                  className="text-emerald-700 underline"
                >
                  {t("auth.signup.link")}
                </Link>
              </p>

              {legacyEnabled ? (
                <details className="rounded-md border border-zinc-200 p-3 text-sm text-zinc-600">
                  <summary className="cursor-pointer font-medium text-zinc-700">
                    {t("auth.login.legacySummary")}
                  </summary>
                  <div className="mt-3">
                    <AuthForm mode="login" />
                  </div>
                </details>
              ) : null}
            </div>
          ) : legacyEnabled ? (
            <div className="mt-6">
              <AuthForm mode="login" />
              <p className="mt-4 text-sm text-zinc-600">
                {t("auth.login.noAccount")}{" "}
                <Link href="/signup" className="text-emerald-700 underline">
                  {t("auth.signup.link")}
                </Link>
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-zinc-600">{t("auth.login.unavailable")}</p>
          )}
        </AppCard>
      </div>
    </ProductPageShell>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l.1.1 6.2 5.2C39.2 36.4 44 31.3 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
