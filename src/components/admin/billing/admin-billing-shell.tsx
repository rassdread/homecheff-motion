"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/billing", label: "Overview" },
  { href: "/admin/billing/subscriptions", label: "Subscriptions" },
  { href: "/admin/billing/credit-packs", label: "Credit packs" },
  { href: "/admin/billing/promotions", label: "Promotions" },
  { href: "/admin/billing/campaigns", label: "New user campaigns" },
  { href: "/admin/billing/stripe", label: "Stripe readiness" },
  { href: "/admin/billing/analytics", label: "Analytics" },
];

export function AdminBillingShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <Link href="/admin" className="mt-2 inline-block text-sm text-emerald-700 underline">
          ← Admin dashboard
        </Link>
      </div>

      <nav className="flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              pathname === item.href
                ? "bg-emerald-600 text-white"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

export function AdminStatGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} label={item.label} value={item.value} />
      ))}
    </section>
  );
}
