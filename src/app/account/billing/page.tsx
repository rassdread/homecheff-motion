import { StudioBillingPanel } from "@/components/account/studio-billing-panel";
import { StudioAccountDashboard } from "@/components/account/studio-account-dashboard";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadStudioAccountOverview } from "@/server/studio-account/studio-account-service";

export default async function AccountBillingPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const overview = await loadStudioAccountOverview(user.id, user.email);

  return (
    <div className="space-y-8">
      <StudioAccountDashboard initial={overview} showLedger={false} />
      <StudioBillingPanel />
    </div>
  );
}
