"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductPageShell } from "@/components/layout/product-page-shell";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { validateStudioReturnTo } from "@/lib/identity/return-path";
import {
  readStudioWelcomePreferences,
  writeStudioWelcomePreferences,
  type StudioWelcomePreferences,
} from "@/lib/identity/studio-welcome";

/** What do you mainly want to create? (product-purpose prefs only) */
const INTERESTS = ["social", "ads", "education", "brand", "storytelling", "other"] as const;

/**
 * Map welcome "how to start" → guided Studio entry (SP.1 / Experience Pack path).
 * Prefer /maak and /studio over legacy Editor.
 */
export function resolveWelcomeNextPath(
  defaultWorkspace: StudioWelcomePreferences["defaultWorkspace"],
  fallbackReturnTo: string,
): string {
  const safeFallback = validateStudioReturnTo(fallbackReturnTo);
  if (safeFallback !== "/" && safeFallback !== "/welcome") {
    return safeFallback;
  }
  switch (defaultWorkspace) {
    case "editor":
      return "/maak";
    case "studio":
      return "/studio";
    case "motion":
    default:
      return "/studio";
  }
}

/**
 * SP.2B.1 / SP.2B.8 — First Studio visit wizard (product prefs only).
 * Never asks for name / email / password / Google (IdP already owns those).
 * Session (studio_session) must already exist before this route.
 */
export default function StudioWelcomeClient() {
  const t = useActiveTranslator();
  const router = useRouter();
  const search = useSearchParams();
  const returnTo = validateStudioReturnTo(search.get("next"));

  const [preferredLanguage, setPreferredLanguage] =
    useState<StudioWelcomePreferences["preferredLanguage"]>("nl");
  const [creatorOrBusiness, setCreatorOrBusiness] =
    useState<StudioWelcomePreferences["creatorOrBusiness"]>("creator");
  const [creativeInterests, setCreativeInterests] = useState<string[]>([]);
  const [defaultWorkspace, setDefaultWorkspace] =
    useState<StudioWelcomePreferences["defaultWorkspace"]>("studio");
  const [company, setCompany] = useState("");

  useEffect(() => {
    const existing = readStudioWelcomePreferences();
    if (existing) {
      router.replace(returnTo === "/" ? "/studio" : returnTo);
    }
  }, [returnTo, router]);

  function toggleInterest(id: string) {
    setCreativeInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function complete(prefs: StudioWelcomePreferences) {
    writeStudioWelcomePreferences(prefs);
    router.replace(resolveWelcomeNextPath(prefs.defaultWorkspace, returnTo));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    complete({
      completedAt: new Date().toISOString(),
      preferredLanguage,
      creatorOrBusiness,
      creativeInterests,
      defaultWorkspace,
      company: company.trim() || undefined,
    });
  }

  function onSkip() {
    complete({
      completedAt: new Date().toISOString(),
      preferredLanguage,
      creatorOrBusiness,
      creativeInterests: [],
      defaultWorkspace: "motion",
      company: undefined,
    });
  }

  return (
    <ProductPageShell contained className="!min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto w-full max-w-xl py-6">
        <AppCard>
          <p className="text-sm font-semibold text-emerald-800">{t("auth.login.brandStudio")}</p>
          <h1 className="mt-2 text-2xl font-semibold">{t("auth.welcome.title")}</h1>
          <p className="mt-2 text-sm text-zinc-600">{t("auth.welcome.subtitle")}</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">{t("auth.welcome.language")}</span>
              <select
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                value={preferredLanguage}
                onChange={(e) =>
                  setPreferredLanguage(e.target.value as StudioWelcomePreferences["preferredLanguage"])
                }
              >
                <option value="nl">Nederlands</option>
                <option value="en">English</option>
              </select>
            </label>

            <fieldset>
              <legend className="mb-1 text-sm text-zinc-700">{t("auth.welcome.role")}</legend>
              <div className="flex flex-wrap gap-2">
                {(["creator", "business", "both"] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setCreatorOrBusiness(role)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      creatorOrBusiness === role
                        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                        : "border-zinc-300 text-zinc-700"
                    }`}
                  >
                    {t(`auth.welcome.role.${role}`)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm text-zinc-700">{t("auth.welcome.interests")}</legend>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleInterest(id)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      creativeInterests.includes(id)
                        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                        : "border-zinc-300 text-zinc-700"
                    }`}
                  >
                    {t(`auth.welcome.interest.${id}`)}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-sm text-zinc-700">{t("auth.welcome.workspace")}</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["studio", "auth.welcome.workspace.studio"],
                    ["editor", "auth.welcome.workspace.editor"],
                    ["motion", "auth.welcome.workspace.motion"],
                  ] as const
                ).map(([value, labelKey]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDefaultWorkspace(value)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      defaultWorkspace === value
                        ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                        : "border-zinc-300 text-zinc-700"
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">{t("auth.welcome.company")}</span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                placeholder={t("auth.welcome.companyPlaceholder")}
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {t("auth.welcome.continue")}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {t("auth.welcome.skip")}
            </button>
          </form>
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
