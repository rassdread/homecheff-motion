import { ReactNode } from "react";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  children: ReactNode;
  className?: string;
  /** Constrain content width (default true) */
  contained?: boolean;
};

export function ProductPageShell({
  children,
  className = "",
  contained = true,
}: Props) {
  return (
    <main className={`${studioVisual.pageBg} ${className}`}>
      <div
        className={
          contained
            ? "mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10"
            : "w-full"
        }
      >
        {children}
      </div>
    </main>
  );
}
