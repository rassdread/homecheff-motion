import { ReactNode } from "react";

type AppCardProps = {
  children: ReactNode;
  className?: string;
};

export function AppCard({ children, className = "" }: AppCardProps) {
  return (
    <section
      className={`rounded-3xl border border-emerald-100 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(16,185,129,0.4)] ${className}`}
    >
      {children}
    </section>
  );
}
