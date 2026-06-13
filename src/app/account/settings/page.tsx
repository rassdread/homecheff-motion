import { StudioAccountDashboard } from "@/components/account/studio-account-dashboard";
import { getAuthenticatedUser } from "@/server/auth/session";
import { loadStudioAccountOverview } from "@/server/studio-account/studio-account-service";

export default async function AccountSettingsPage() {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const overview = await loadStudioAccountOverview(user.id, user.email);
  return <StudioAccountDashboard initial={overview} showSettings showLedger={false} />;
}
