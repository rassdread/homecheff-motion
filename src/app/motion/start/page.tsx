import { redirect } from "next/navigation";
import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Deep-link shim: preset/showcase params → instant wizard; otherwise Motion Hub.
 */
export default async function MotionStartPage({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      qs.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        qs.append(key, entry);
      }
    }
  }
  const preset = qs.get("preset");
  const showcaseItem = qs.get("showcaseItem");
  const photoIntent = qs.get("photoIntent");
  const returnTo = safeStudioProjectReturnTo(qs.get("returnTo"));
  qs.delete("returnTo");
  const withReturn = (path: string) => {
    if (!returnTo) return path;
    const joiner = path.includes("?") ? "&" : "?";
    return `${path}${joiner}returnTo=${encodeURIComponent(returnTo)}`;
  };
  if (preset || showcaseItem || photoIntent || qs.get("prefill")) {
    const suffix = qs.toString();
    redirect(withReturn(suffix ? `/animate/instant?${suffix}` : "/animate/instant"));
  }
  const category = qs.get("category");
  redirect(withReturn(category ? `/motion?category=${category}` : "/motion"));
}
