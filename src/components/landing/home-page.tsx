"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UniverseHomePage } from "@/components/suite/universe/universe-home-page";
import { HomeEcosystemPage } from "@/components/landing/home-ecosystem-page";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { useAuthSession } from "@/hooks/use-auth-session";
import { isHomeCheffProductSuiteNavEnabled } from "@/lib/homecheff-product-suite-flag";

/** App root — Universe landing for everyone when suite nav is enabled. */
export function HomePage() {
  if (isHomeCheffProductSuiteNavEnabled()) {
    return <UniverseHomePage />;
  }

  return <LegacyHomeRedirect />;
}

function LegacyHomeRedirect() {
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
