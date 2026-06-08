"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioShellHeader } from "@/components/studio/studio-shell-header";
import { useActiveTranslator } from "@/i18n/client";
import { brand } from "@/lib/brand";
import type { UserAccountProfile, UserAccountResponse } from "@/types/user-account-profile";

export function StudioAccountPage() {
  const t = useActiveTranslator();
  const [account, setAccount] = useState<UserAccountResponse | null>(null);
  const [profile, setProfile] = useState<UserAccountProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError("");
      const res = await fetch("/api/me/account", { cache: "no-store" });
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        queueMicrotask(() => setError(t("studio.account.error.loadFailed")));
        return;
      }
      const data = (await res.json()) as { ok: true } & UserAccountResponse;
      queueMicrotask(() => {
        setAccount({ email: data.email, profile: data.profile });
        setProfile(data.profile);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSave = async () => {
    if (!profile) {
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    const res = await fetch("/api/me/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: profile.displayName,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        locale: profile.locale,
        emailNotifications: profile.emailNotifications,
        productUpdates: profile.productUpdates,
        privacyAnalytics: profile.privacyAnalytics,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("studio.account.error.saveFailed"));
      return;
    }
    const data = (await res.json()) as { ok: true } & UserAccountResponse;
    setAccount(data);
    setProfile(data.profile);
    setMessage(t("studio.account.saved"));
  };

  const handleDelete = async () => {
    if (!window.confirm(t("studio.account.deleteConfirm"))) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/me/account", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError(t("studio.account.error.deleteFailed"));
      return;
    }
    window.location.href = "/login";
  };

  return (
    <StudioAuthGate>
      <main className={`flex min-h-screen flex-col ${brand.softGradientBg}`}>
        <StudioShellHeader projectTitle={t("studio.account.title")} />

        <section className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
          {error ?
            <p className="text-sm text-red-700">{error}</p>
          : !profile || !account ?
            <p className="text-sm text-zinc-600">{t("studio.account.loading")}</p>
          : (
            <form
              className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.displayName")}
                </label>
                <input
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 px-3 text-sm"
                  value={profile.displayName}
                  onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.username")}
                </label>
                <input
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 px-3 text-sm"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.email")}
                </label>
                <input
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-600"
                  value={account.email}
                  readOnly
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.avatarUrl")}
                </label>
                <input
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 px-3 text-sm"
                  value={profile.avatarUrl ?? ""}
                  onChange={(e) =>
                    setProfile({ ...profile, avatarUrl: e.target.value.trim() || null })
                  }
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.locale")}
                </label>
                <select
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-200 px-3 text-sm"
                  value={profile.locale}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      locale: e.target.value === "en" ? "en" : "nl",
                    })
                  }
                >
                  <option value="nl">{t("studio.account.localeNl")}</option>
                  <option value="en">{t("studio.account.localeEn")}</option>
                </select>
              </div>
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.notifications")}
                </legend>
                <label className="flex min-h-[44px] items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.emailNotifications}
                    onChange={(e) =>
                      setProfile({ ...profile, emailNotifications: e.target.checked })
                    }
                  />
                  {t("studio.account.emailNotifications")}
                </label>
                <label className="flex min-h-[44px] items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.productUpdates}
                    onChange={(e) => setProfile({ ...profile, productUpdates: e.target.checked })}
                  />
                  {t("studio.account.productUpdates")}
                </label>
              </fieldset>
              <fieldset>
                <legend className="text-xs font-semibold uppercase text-zinc-500">
                  {t("studio.account.privacy")}
                </legend>
                <label className="mt-3 flex min-h-[44px] items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={profile.privacyAnalytics}
                    onChange={(e) =>
                      setProfile({ ...profile, privacyAnalytics: e.target.checked })
                    }
                  />
                  {t("studio.account.privacyAnalytics")}
                </label>
              </fieldset>

              {message ?
                <p className="text-sm text-[#006D52]">{message}</p>
              : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#006D52] px-5 text-sm font-semibold text-white hover:bg-[#005a44] disabled:opacity-60"
                >
                  {t("studio.actions.save")}
                </button>
                <Link
                  href="/studio"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {t("studio.account.backToMyStudio")}
                </Link>
              </div>

              <div className="border-t border-zinc-100 pt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete()}
                  className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
                >
                  {t("studio.account.deleteAccount")}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
