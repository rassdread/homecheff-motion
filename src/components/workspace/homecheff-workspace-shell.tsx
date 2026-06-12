"use client";

import { ReactNode, useState } from "react";
import { HomeCheffWorkspaceBottomBar } from "@/components/workspace/homecheff-workspace-bottom-bar";
import { useActiveTranslator } from "@/i18n/client";
import { workspaceVisual } from "@/lib/homecheff-workspace-tokens";

type Props = {
  left?: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  className?: string;
};

export function HomeCheffWorkspaceShell({ left, center, right, bottom, className = "" }: Props) {
  const t = useActiveTranslator();
  const [mobilePane, setMobilePane] = useState<"left" | "right" | null>(null);

  return (
    <div className={`${workspaceVisual.shellBg} ${className}`} data-testid="homecheff-workspace-shell">
      <div className={workspaceVisual.grid}>
        {(left || right) ?
          <div className="flex gap-2 lg:hidden">
            {left ?
              <button
                type="button"
                className={workspaceVisual.mobilePaneTrigger}
                onClick={() => setMobilePane("left")}
              >
                {t("platform.workspace.assets" as never)}
              </button>
            : null}
            {right ?
              <button
                type="button"
                className={workspaceVisual.mobilePaneTrigger}
                onClick={() => setMobilePane("right")}
              >
                {t("platform.workspace.tools" as never)}
              </button>
            : null}
          </div>
        : null}

        {left ?
          <aside className={workspaceVisual.leftPanel} data-testid="workspace-left">
            <div className={workspaceVisual.glassPanel}>{left}</div>
          </aside>
        : null}

        <main className={workspaceVisual.centerPanel} data-testid="workspace-center">
          {center}
        </main>

        {right ?
          <aside className={workspaceVisual.rightPanel} data-testid="workspace-right">
            <div className={workspaceVisual.glassPanel}>{right}</div>
          </aside>
        : null}

        {bottom ?
          <div className="lg:col-span-full">
            <HomeCheffWorkspaceBottomBar>{bottom}</HomeCheffWorkspaceBottomBar>
          </div>
        : null}
      </div>

      {mobilePane ?
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setMobilePane(null)}
        >
          <div
            className="max-h-[80dvh] overflow-y-auto rounded-t-2xl border border-white/12 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="mb-3 min-h-11 w-full rounded-full border border-zinc-200 text-sm font-semibold text-zinc-700"
              onClick={() => setMobilePane(null)}
            >
              {t("editor.flow.back" as never)}
            </button>
            {mobilePane === "left" ? left : right}
          </div>
        </div>
      : null}
    </div>
  );
}
