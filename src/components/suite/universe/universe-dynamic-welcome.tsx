"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { resolveUniverseWelcomeName } from "@/lib/universe-home-config";
import { resolveUniverseWelcomeMessagesPublic } from "@/lib/universe-public-landing";

type UniverseDynamicWelcomeProps = {
  email?: string;
  isAuthenticated: boolean;
  reducedMotion?: boolean;
};

const ROTATE_MS = 5200;

/** Rotating welcome line for signed-in users only */
export function UniverseDynamicWelcome({
  email,
  isAuthenticated,
  reducedMotion = false,
}: UniverseDynamicWelcomeProps) {
  const t = useActiveTranslator();
  const messages = useMemo(
    () => resolveUniverseWelcomeMessagesPublic(email, isAuthenticated),
    [email, isAuthenticated]
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  const welcomeName = resolveUniverseWelcomeName(email);
  const key = messages[index] ?? messages[0]!;
  const text =
    key === "universe.welcome.back" && welcomeName
      ? t(key, { name: welcomeName })
      : t(key as never);

  useEffect(() => {
    if (!isAuthenticated || reducedMotion || messages.length <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setPhase("out");
      window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setPhase("in");
      }, 420);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, messages.length, reducedMotion]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <p
      key={`${key}-${index}`}
      className="mb-2 text-center text-sm font-medium text-white/75"
      style={{
        animation:
          reducedMotion || phase === "in"
            ? "universe-welcome-in 0.6s ease-out forwards"
            : "universe-welcome-out 0.4s ease-in forwards",
      }}
    >
      {text}
    </p>
  );
}
