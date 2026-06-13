import { redirect } from "next/navigation";

/** Usage detail — redirects to existing Mijn Verbruik with provider EUR history. */
export default function AccountUsagePage() {
  redirect("/mijn-verbruik");
}
