import { LinkHomeCheffIdentityCard } from "@/components/account/link-homecheff-identity-card";
import { StudioAccountDashboard } from "@/components/account/studio-account-dashboard";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadStudioAccountOverview } from "@/server/studio-account/studio-account-service";
import { prisma } from "@/lib/prisma";

export default async function AccountSettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const identity = await prisma.user.findUnique({
    where: { id: user.id },
    select: { centralUserId: true, centralLinkedAt: true },
  });

  const overview = await loadStudioAccountOverview(user.id, user.email);
  return (
    <div className="space-y-6">
      <LinkHomeCheffIdentityCard
        linked={Boolean(identity?.centralUserId)}
        ssoEnabled={isCentralSsoLive()}
      />
      <StudioAccountDashboard initial={overview} showSettings showLedger={false} />
    </div>
  );
}
