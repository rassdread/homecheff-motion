import { AdminLayoutChrome } from "@/components/admin/admin-layout-chrome";
import { getAuthenticatedUser } from "@/server/auth/session";
import { canAccessAdmin } from "@/server/auth/permissions";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login?next=/admin");
  }
  if (!canAccessAdmin(user)) {
    return <AdminLayoutChrome forbidden>{children}</AdminLayoutChrome>;
  }

  return <AdminLayoutChrome>{children}</AdminLayoutChrome>;
}
