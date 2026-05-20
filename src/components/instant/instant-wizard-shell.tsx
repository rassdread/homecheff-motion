"use client";

import type { ReactNode, RefObject } from "react";
import { AppCard } from "@/components/ui/app-card";

type InstantWizardShellProps = {
  children: ReactNode;
  shellRef?: RefObject<HTMLDivElement | null>;
  className?: string;
};

export function InstantWizardShell({ children, shellRef, className = "" }: InstantWizardShellProps) {
  return (
    <div ref={shellRef} className={`scroll-mt-6 ${className}`}>
      <AppCard className="flex min-h-0 flex-col overflow-hidden !p-0">
        {children}
      </AppCard>
    </div>
  );
}
