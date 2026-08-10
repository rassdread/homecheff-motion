import type { Metadata } from "next";
import { AdminLayoutChrome } from "@/components/admin/admin-layout-chrome";
import { buildNoIndexMetadata, buildPageMetadata } from "@/lib/seo/site-metadata";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";
import { getAuthenticatedUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Admin",
    description: "HomeCheff Studio administration.",
    path: "/admin",
  }),
  ...buildNoIndexMetadata(),
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate("/admin");
  }
  if (!canAccessAdmin(user!)) {
    return <AdminLayoutChrome forbidden>{children}</AdminLayoutChrome>;
  }

  return <AdminLayoutChrome>{children}</AdminLayoutChrome>;
}
