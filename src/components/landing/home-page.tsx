"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HomeEcosystemPage } from "@/components/landing/home-ecosystem-page";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { useAuthSession } from "@/hooks/use-auth-session";

/** Public marketing landing for guests; signed-in users go straight to Studio. */
export function HomePage() {
  const session = useAuthSession();
  const router = useRouter();

  useEffect(() => {
    if (session.resolved && session.user) {
      router.replace("/studio");
    }
  }, [session.resolved, session.user, router]);

  if (!session.resolved || session.user) {
    return (
      <main className="flex-1">
        <WorkspaceLoadingSkeleton />
      </main>
    );
  }

  return <HomeEcosystemPage />;
}
