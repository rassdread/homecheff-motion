import { redirect } from "next/navigation";
import { StudioProvidersClient } from "@/components/studio/studio-providers-client";
import { redirectUnauthenticatedPrivate } from "@/lib/identity/sso/private-entry";
import { canAccessAdmin } from "@/server/auth/permissions";
import { getAuthenticatedUser } from "@/server/auth/session";

/** Provider configuration — admin-only; hidden from normal Studio users. */
export default async function StudioProvidersPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    await redirectUnauthenticatedPrivate("/studio/providers");
  }
  if (!canAccessAdmin(user!)) {
    redirect("/studio");
  }

  return <StudioProvidersClient />;
}
