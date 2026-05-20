"use client";

import type { ReactNode } from "react";

type InstantWizardContentProps = {
  children: ReactNode;
};

export function InstantWizardContent({ children }: InstantWizardContentProps) {
  return (
    <div className="min-h-[clamp(420px,58vh,720px)] flex-1 overflow-y-auto px-4 pb-4 pt-6 sm:px-6">
      {children}
    </div>
  );
}
