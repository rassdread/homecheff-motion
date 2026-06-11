import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

export default function UsageLandingPage() {
  return <StudioProductLandingPage config={studioProductLandingConfig("usage")} />;
}
