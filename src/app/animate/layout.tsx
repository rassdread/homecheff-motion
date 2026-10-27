import { Suspense } from "react";
import { StudioProjectReturnLink } from "@/components/studio/studio-project-return-link";

export default function AnimateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <StudioProjectReturnLink />
      </Suspense>
      {children}
    </>
  );
}
