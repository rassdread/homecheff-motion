"use client";

import type { ReactNode, RefObject } from "react";
import { AppCard } from "@/components/ui/app-card";

type InstantWizardShellProps = {
  children: ReactNode;
  shellRef?: RefObject<HTMLDivElement | null>;
  className?: string;
  id?: string;
};

export function InstantWizardShell({ children, shellRef, className = "", id }: InstantWizardShellProps) {
  return (
    <div id={id} ref={shellRef} className={`scroll-mt-6 ${className}`}>
      <AppCard className="flex flex-col overflow-visible !p-0">
        {children}
      </AppCard>
    </div>
  );
}
