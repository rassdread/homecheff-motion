"use client";

import { AdminBillingShell } from "@/components/admin/billing/admin-billing-shell";
import { AdminPricingCatalogPanel } from "@/components/admin/billing/admin-pricing-catalog-panel";
import { useActiveTranslator } from "@/i18n/client";

export default function AdminBillingPricingPage() {
  const t = useActiveTranslator();

  return (
    <AdminBillingShell title={t("admin.pricing.title" as never)}>
      <AdminPricingCatalogPanel />
    </AdminBillingShell>
  );
}
