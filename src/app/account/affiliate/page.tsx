import { redirect } from "next/navigation";
import { CENTRAL_AFFILIATE_DASHBOARD_HREF } from "@/lib/affiliate/studio-ecosystem-nav";

/** The Studio affiliate screen is not a second dashboard. */
export default function StudioAffiliateDashboardPage() {
  redirect(CENTRAL_AFFILIATE_DASHBOARD_HREF);
}
