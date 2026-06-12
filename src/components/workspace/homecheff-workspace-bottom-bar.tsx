"use client";

import { ReactNode } from "react";
import { workspaceVisual } from "@/lib/homecheff-workspace-tokens";

type Props = {
  children: ReactNode;
  className?: string;
};

export function HomeCheffWorkspaceBottomBar({ children, className = "" }: Props) {
  return (
    <footer
      className={`${workspaceVisual.bottomBar} ${className}`}
      data-testid="homecheff-workspace-bottom-bar"
    >
      <div className={`${workspaceVisual.glassPanel} lg:mt-0`}>{children}</div>
    </footer>
  );
}
