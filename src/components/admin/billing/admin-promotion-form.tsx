"use client";

import { useMemo, useState } from "react";
import {
  buildPromotionPreviewSentence,
  buildPromotionPricePreviews,
} from "@/lib/studio-promotion-preview";
import type { PromotionFormInput } from "@/lib/studio-promotion-validation";
import type { PromotionBenefitType } from "@/types/studio-billing";

const DEFAULT_FORM: PromotionFormInput = {
  name: "",
  slug: "",
  code: "",
  descriptionInternal: "",
  active: true,
  benefitType: "percentage_discount",
  percentageDiscount: 20,
  discountDuration: "repeating",
  discountDurationMonths: 3,
  planTarget: "pro",
  maxRedemptions: 100,
  maxRedemptionsPerUser: 1,
  maxUses: 100,
  newUserOnly: false,
  grantType: "PROMOTIONAL",
};

type Props = {
  onCreated: () => void;
};

export function AdminPromotionForm({ onCreated }: Props) {
  const [form, setForm] = useState<PromotionFormInput>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewSentence = useMemo(
    () =>
      buildPromotionPreviewSentence(
        {
          code: form.code || "PROMO",
          benefitType: form.benefitType,
          percentageDiscount: form.percentageDiscount,
          fixedDiscountEur: form.fixedDiscountEur,
          subscriptionDiscountPercent: form.subscriptionDiscountPercent,
          discountDuration: form.discountDuration,
          discountDurationMonths: form.discountDurationMonths,
          specificPlanSlug:
            form.planTarget === "creator" || form.planTarget === "pro" || form.planTarget === "studio"
              ? form.planTarget
              : null,
          appliesToMonthly: form.planTarget !== "yearly_only",
          appliesToYearly: form.planTarget !== "monthly_only",
        },
        "nl"
      ),
    [form]
  );

  const pricePreviews = useMemo(
    () =>
      buildPromotionPricePreviews({
        code: form.code,
        benefitType: form.benefitType,
        percentageDiscount: form.percentageDiscount,
        fixedDiscountEur: form.fixedDiscountEur,
        subscriptionDiscountPercent: form.subscriptionDiscountPercent,
        discountDuration: form.discountDuration,
        specificPlanSlug:
          form.planTarget === "creator" || form.planTarget === "pro" || form.planTarget === "studio"
            ? form.planTarget
            : null,
        appliesToMonthly: form.planTarget !== "yearly_only",
        appliesToYearly: form.planTarget !== "monthly_only",
      }),
    [form]
  );

  const showDiscountFields =
    form.benefitType === "percentage_discount" ||
    form.benefitType === "fixed_discount" ||
    form.benefitType === "subscription_discount";

  const showBonusFields =
    form.benefitType === "bonus_credits" || form.benefitType === "free_trial_credits";

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/billing/promotions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json()) as { ok?: boolean; errors?: string[]; error?: string };
    setSaving(false);
    if (!res.ok) {
      setError(data.errors?.join(", ") ?? data.error ?? "Opslaan mislukt");
      return;
    }
    setForm(DEFAULT_FORM);
    onCreated();
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="font-semibold">Nieuwe promotie + code</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Kortingen worden als Stripe Coupon + Promotion Code aangemaakt. Bonus credits blijven lokaal.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">Naam promotie</span>
          <input
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Slug (intern)</span>
          <input
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Promotiecode</span>
          <input
            className="mt-1 w-full rounded border px-2 py-1.5 uppercase"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Type promotie</span>
          <select
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.benefitType}
            onChange={(e) =>
              setForm((f) => ({ ...f, benefitType: e.target.value as PromotionBenefitType }))
            }
          >
            <option value="percentage_discount">Percentage korting</option>
            <option value="fixed_discount">Vast bedrag korting</option>
            <option value="bonus_credits">Bonus credits</option>
            <option value="free_trial_credits">Gratis trial / extra maand</option>
            <option value="subscription_discount">Eerste maand korting</option>
          </select>
        </label>
        <label className="col-span-full text-sm">
          <span className="font-medium">Beschrijving (intern)</span>
          <textarea
            className="mt-1 w-full rounded border px-2 py-1.5"
            rows={2}
            value={form.descriptionInternal ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, descriptionInternal: e.target.value }))}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Actief</span>
          <select
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.active ? "yes" : "no"}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === "yes" }))}
          >
            <option value="yes">Ja</option>
            <option value="no">Nee</option>
          </select>
        </label>
      </div>

      {showDiscountFields ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 sm:grid-cols-2">
          <h3 className="col-span-full text-sm font-semibold text-emerald-900">Korting</h3>
          {(form.benefitType === "percentage_discount" ||
            form.benefitType === "subscription_discount") && (
            <label className="text-sm">
              <span className="font-medium">Kortingspercentage (%)</span>
              <input
                type="number"
                min={1}
                max={100}
                className="mt-1 w-full rounded border px-2 py-1.5"
                value={
                  form.benefitType === "subscription_discount"
                    ? (form.subscriptionDiscountPercent ?? "")
                    : (form.percentageDiscount ?? "")
                }
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (form.benefitType === "subscription_discount") {
                    setForm((f) => ({ ...f, subscriptionDiscountPercent: v }));
                  } else {
                    setForm((f) => ({ ...f, percentageDiscount: v }));
                  }
                }}
              />
            </label>
          )}
          {form.benefitType === "fixed_discount" && (
            <label className="text-sm">
              <span className="font-medium">Bedrag (EUR)</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                className="mt-1 w-full rounded border px-2 py-1.5"
                value={form.fixedDiscountEur ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, fixedDiscountEur: Number(e.target.value) }))}
              />
            </label>
          )}
          <label className="text-sm">
            <span className="font-medium">Duur</span>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={form.discountDuration ?? "once"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  discountDuration: e.target.value as PromotionFormInput["discountDuration"],
                }))
              }
            >
              <option value="once">Eenmalig</option>
              <option value="repeating">Voor X maanden</option>
              <option value="forever">Voor altijd</option>
            </select>
          </label>
          {form.discountDuration === "repeating" && (
            <label className="text-sm">
              <span className="font-medium">Aantal maanden</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded border px-2 py-1.5"
                value={form.discountDurationMonths ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountDurationMonths: Number(e.target.value) }))
                }
              />
            </label>
          )}
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Geldt voor</span>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={form.planTarget ?? "all"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  planTarget: e.target.value as PromotionFormInput["planTarget"],
                }))
              }
            >
              <option value="all">Alle plannen</option>
              <option value="creator">Alleen Creator</option>
              <option value="pro">Alleen Pro</option>
              <option value="studio">Alleen Studio</option>
              <option value="monthly_only">Alleen maandabonnementen</option>
              <option value="yearly_only">Alleen jaarabonnementen</option>
            </select>
          </label>
          <p className="col-span-full text-xs text-emerald-800">
            Stripe: coupon + promotion code worden automatisch aangemaakt bij opslaan.
          </p>
        </div>
      ) : null}

      {showBonusFields ? (
        <div className="mt-4 grid gap-3 rounded-lg border border-amber-100 bg-amber-50/50 p-4 sm:grid-cols-2">
          <h3 className="col-span-full text-sm font-semibold text-amber-900">Bonus credits</h3>
          <label className="text-sm">
            <span className="font-medium">Aantal credits</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={
                form.benefitType === "free_trial_credits"
                  ? (form.freeTrialCredits ?? "")
                  : (form.creditAmount ?? "")
              }
              onChange={(e) => {
                const v = Number(e.target.value);
                if (form.benefitType === "free_trial_credits") {
                  setForm((f) => ({ ...f, freeTrialCredits: v }));
                } else {
                  setForm((f) => ({ ...f, creditAmount: v }));
                }
              }}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Wanneer toepassen</span>
            <select
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={form.bonusCreditsApplyWhen ?? "first_payment"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bonusCreditsApplyWhen: e.target.value as PromotionFormInput["bonusCreditsApplyWhen"],
                }))
              }
            >
              <option value="registration">Bij registratie</option>
              <option value="first_payment">Bij eerste betaling</option>
              <option value="manual">Handmatig / admin</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Verloopt na (dagen, optioneel)</span>
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border px-2 py-1.5"
              value={form.bonusCreditsExpireDays ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bonusCreditsExpireDays: e.target.value ? Number(e.target.value) : null,
                }))
              }
            />
          </label>
          <p className="col-span-full text-xs text-amber-800">Geen Stripe coupon — lokaal beheerd.</p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <h3 className="col-span-full text-sm font-semibold">Limieten</h3>
        <label className="text-sm">
          <span className="font-medium">Max totaal gebruik</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.maxRedemptions ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, maxRedemptions: Number(e.target.value), maxUses: Number(e.target.value) }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Max per gebruiker</span>
          <input
            type="number"
            min={1}
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.maxRedemptionsPerUser ?? 1}
            onChange={(e) =>
              setForm((f) => ({ ...f, maxRedemptionsPerUser: Number(e.target.value) }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Geldig vanaf</span>
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.startDate?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value ? `${e.target.value}T00:00:00.000Z` : null }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Geldig tot</span>
          <input
            type="date"
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.endDate?.slice(0, 10) ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, endDate: e.target.value ? `${e.target.value}T23:59:59.000Z` : null }))
            }
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Alleen nieuwe gebruikers</span>
          <select
            className="mt-1 w-full rounded border px-2 py-1.5"
            value={form.newUserOnly ? "yes" : "no"}
            onChange={(e) => setForm((f) => ({ ...f, newUserOnly: e.target.value === "yes" }))}
          >
            <option value="no">Nee</option>
            <option value="yes">Ja</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <h3 className="text-sm font-semibold">Live preview</h3>
        <p className="mt-2 text-sm">{previewSentence}</p>
        {pricePreviews.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            {pricePreviews.map((row) => (
              <li key={`${row.planId}-${row.interval}`}>
                {row.label} {row.interval === "yearly" ? "jaar" : "maand"}: €{row.baseEur.toFixed(2)} → €
                {row.discountedEur.toFixed(2)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void submit()}
        className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Opslaan…" : "Promotie aanmaken"}
      </button>
    </section>
  );
}
