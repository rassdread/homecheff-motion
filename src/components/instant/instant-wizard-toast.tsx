"use client";

type Props = {
  message: string | null;
};

export function InstantWizardToast({ message }: Props) {
  if (!message) {
    return null;
  }
  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 z-[60] max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-950 px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
