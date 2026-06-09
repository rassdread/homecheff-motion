"use client";

import { useEffect, useMemo, useState } from "react";
import type { TranslationKey } from "@/i18n";
import { useActiveTranslator } from "@/i18n/client";
import {
  resolveUniverseWelcomeMessages,
  resolveUniverseWelcomeName,
} from "@/lib/universe-home-config";

type UniverseDynamicWelcomeProps = {
  email?: string;
  reducedMotion?: boolean;
};

const ROTATE_MS = 5200;

export function UniverseDynamicWelcome({ email, reducedMotion = false }: UniverseDynamicWelcomeProps) {
  const t = useActiveTranslator();
  const messages = useMemo(() => resolveUniverseWelcomeMessages(email), [email]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  const welcomeName = resolveUniverseWelcomeName(email);
  const key = messages[index] ?? messages[0]!;
  const text =
    key === "universe.welcome.back" && welcomeName
      ? t(key, { name: welcomeName })
      : t(key);

  useEffect(() => {
    if (reducedMotion || messages.length <= 1) {
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
  }, [messages.length, reducedMotion]);

  return (
    <header className="relative z-20 mb-2 text-center sm:mb-4">
      <p
        key={`${key}-${index}`}
        className="text-base font-medium tracking-wide text-white/85 sm:text-lg"
        style={{
          animation:
            reducedMotion || phase === "in"
              ? "universe-welcome-in 0.6s ease-out forwards"
              : "universe-welcome-out 0.4s ease-in forwards",
        }}
      >
        {text}
      </p>
      <h1 className="sr-only">{t("universe.title")}</h1>
    </header>
  );
}
