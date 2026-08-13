"use client";

import { OntdekHomeCheffMenu } from "@/components/ecosystem/ontdek-homecheff-menu";
import { useAuthSession } from "@/hooks/use-auth-session";

/** Client island for AppShell header — discovery without touching SSO. */
export function OntdekHomeCheffShellControl() {
  const session = useAuthSession();
  const authenticated = Boolean(session.user);
  return (
    <OntdekHomeCheffMenu
      currentProduct="studio"
      authenticated={authenticated}
      surface="header"
      variant="compact"
      className=""
    />
  );
}
