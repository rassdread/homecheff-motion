import Link from "next/link";
import { getAuthenticatedUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import { getActiveTranslator } from "@/i18n";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = getActiveTranslator();
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!canAccessAdmin(user)) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-xl font-semibold text-zinc-900">{t("admin.forbiddenTitle")}</h1>
        <p className="mt-2 text-zinc-600">{t("admin.forbiddenDescription")}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-emerald-700 underline">
          {t("admin.backHome")}
        </Link>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <nav className="mb-8 flex flex-wrap gap-4 border-b border-zinc-200 pb-4 text-sm font-medium text-zinc-700">
        <Link href="/admin" className="hover:text-emerald-800">
          {t("admin.nav.dashboard")}
        </Link>
        <Link href="/admin/invites" className="hover:text-emerald-800">
          {t("admin.nav.invites")}
        </Link>
        <Link href="/admin/users" className="hover:text-emerald-800">
          {t("admin.nav.users")}
        </Link>
      </nav>
      {children}
    </div>
  );
}
