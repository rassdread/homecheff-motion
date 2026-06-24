import { Suspense } from "react";
import { StudioProductionShellPage } from "@/components/studio/studio-production-shell";

export default function StudioProductionRoutePage() {
  return (
    <Suspense fallback={null}>
      <StudioProductionShellPage />
    </Suspense>
  );
}
