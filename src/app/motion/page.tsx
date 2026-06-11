import { StudioProductLandingPage } from "@/components/suite/studio-product-landing-page";
import { studioProductLandingConfig } from "@/lib/studio-product-landing-config";

export default function MotionLandingPage() {
  return <StudioProductLandingPage config={studioProductLandingConfig("motion")} />;
}
