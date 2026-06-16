"use client";

import type { ReactNode } from "react";
import { GrowthSidebar } from "@/components/growth/growth-sidebar";
import { growthSidebarLayoutClasses } from "@/lib/growth-sidebar-layout";

type Props = {
  children: ReactNode;
  showSidebar: boolean;
};

export function GrowthSidebarLayout({ children, showSidebar }: Props) {
  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div
      className={growthSidebarLayoutClasses.container}
      data-testid="growth-sidebar-layout"
      data-growth-sidebar-layout="true"
    >
      <main className={growthSidebarLayoutClasses.main} data-testid="growth-sidebar-main">
        {children}
      </main>
      <div
        className={growthSidebarLayoutClasses.sidebarColumn}
        data-testid="growth-sidebar-column"
      >
        <GrowthSidebar />
      </div>
    </div>
  );
}
