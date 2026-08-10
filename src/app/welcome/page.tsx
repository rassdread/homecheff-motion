import { Suspense } from "react";
import StudioWelcomeClient from "./welcome-client";

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-xl px-6 py-12 text-sm text-zinc-600">…</main>
      }
    >
      <StudioWelcomeClient />
    </Suspense>
  );
}
