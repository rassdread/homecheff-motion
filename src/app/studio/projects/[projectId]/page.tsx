import { Suspense } from "react";
import { StudioCreativeProjectWorkspacePage } from "@/components/studio/studio-creative-project-workspace-page";

export default function StudioCreativeProjectPage() {
  return (
    <Suspense fallback={null}>
      <StudioCreativeProjectWorkspacePage />
    </Suspense>
  );
}
