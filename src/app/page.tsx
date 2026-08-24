import { HomePage } from "@/components/landing/home-page";

export const dynamic = "force-dynamic";

/** SEO 0 — public marketing homepage; no automatic silent SSO on anonymous visits. */
export default function Home() {
  return <HomePage />;
}
