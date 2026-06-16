import { redirect } from "next/navigation";

export default function AccountCreditsPage() {
  redirect("/account/billing?tab=credits");
}
