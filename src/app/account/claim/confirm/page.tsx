import { redirect } from "next/navigation";
import { ClaimConfirmClient } from "@/components/account/claim-confirm-client";
import {
  STUDIO_CLAIM_PENDING_COOKIE,
  decodeClaimPending,
} from "@/lib/identity/sso/claim-pending";
import { getAuthenticatedUser } from "@/server/auth/session";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ClaimConfirmPage() {
  const sessionUser = await getAuthenticatedUser();
  if (!sessionUser) {
    redirect("/login?next=/account/settings");
  }

  const jar = await cookies();
  const raw = jar.get(STUDIO_CLAIM_PENDING_COOKIE)?.value;
  let pending;
  try {
    pending = decodeClaimPending(raw ?? null);
  } catch {
    redirect("/account/settings");
  }

  if (pending.claimStudioUserId !== sessionUser.id) {
    redirect("/account/settings");
  }

  return (
    <ClaimConfirmClient
      studioEmail={sessionUser.email}
      studioDisplayName={null}
      homecheffEmail={pending.email}
      homecheffDisplayName={pending.displayName}
      returnTo={pending.returnTo}
    />
  );
}
