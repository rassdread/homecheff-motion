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

const INTERESTS = ["social", "ads", "storytelling", "education", "brand"] as const;

/**
 * SP.2B.1 — First Studio visit wizard (product prefs only).
 * Never asks for name / email / password / Google (IdP already owns those).
 */
export default function StudioWelcomeClient() {
  const t = useActiveTranslator();
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = validateStudioReturnTo(search.get("next"));

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
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  function toggleInterest(id: string) {
    setCreativeInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    writeStudioWelcomePreferences({
      completedAt: new Date().toISOString(),
      preferredLanguage,
      creatorOrBusiness,
      creativeInterests,
      defaultWorkspace,
      company: company.trim() || undefined,
    });
    router.replace(nextPath);
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

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">{t("auth.welcome.workspace")}</span>
              <select
                className="w-full rounded-md border border-zinc-300 px-3 py-2"
                value={defaultWorkspace}
                onChange={(e) =>
                  setDefaultWorkspace(
                    e.target.value as StudioWelcomePreferences["defaultWorkspace"],
                  )
                }
              >
                <option value="studio">{t("auth.welcome.workspace.studio")}</option>
                <option value="editor">{t("auth.welcome.workspace.editor")}</option>
                <option value="motion">{t("auth.welcome.workspace.motion")}</option>
              </select>
            </label>

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
          </form>
        </AppCard>
      </div>
    </ProductPageShell>
  );
}
