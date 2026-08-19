"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";

function StudioStartRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/studio?${qs}` : "/studio");
  }, [router, searchParams]);

  return (
    <main className="flex-1">
      <WorkspaceLoadingSkeleton />
    </main>
  );
}

export default function StudioStartRedirectPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <WorkspaceLoadingSkeleton />
        </main>
      }
    >
      <StudioStartRedirectContent />
    </Suspense>
  );
}
