"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { loginHref } from "@/lib/auth-login-href";

type Variant = "primary" | "secondary";

type Props = {
  variant?: Variant;
  className?: string;
  labelKey?: "studio.start.newStory" | "studio.storyboards.newStoryboard" | "studio.shell.newStory";
};

export function StudioNewStoryButton({
  variant = "primary",
  className = "",
  labelKey = "studio.start.newStory",
}: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [error, setError] = useState("");

  const handleClick = () => {
    setError("");
    if (!session.user) {
      router.push(loginHref("/studio/storyboards/new"));
      return;
    }
    router.push("/studio/storyboards/new");
  };

  const label = t(labelKey);

  if (variant === "secondary") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleClick}
          disabled={!session.resolved}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {label}
        </button>
        {error ?
          <p className="mt-2 text-xs text-red-700">{error}</p>
        : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <GradientButton
        type="button"
        onClick={handleClick}
        disabled={!session.resolved}
        className="w-full sm:w-auto"
      >
        {label}
      </GradientButton>
      {error ?
        <p className="mt-2 text-sm text-red-700">{error}</p>
      : null}
    </div>
  );
}
