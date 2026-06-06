"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { createDefaultStudioStoryboard } from "@/lib/studio-create-story-client";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setError("");
    if (!session.user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    const result = await createDefaultStudioStoryboard(t("studio.storyboards.defaultTitle"));
    setLoading(false);

    if (result.ok) {
      router.push(result.href);
      return;
    }

    if (result.status === 401) {
      router.push("/login");
      return;
    }

    setError(result.error || t("studio.storyboards.error.saveFailed"));
  };

  const label = t(labelKey);
  const loadingLabel = t("studio.start.creatingStory");

  if (variant === "secondary") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => void handleClick()}
          disabled={loading || !session.resolved}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? loadingLabel : label}
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
        onClick={() => void handleClick()}
        loading={loading}
        loadingLabel={loadingLabel}
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
