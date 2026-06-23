import { redirect } from "next/navigation";

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
  if (preset || showcaseItem || photoIntent || qs.get("prefill")) {
    const suffix = qs.toString();
    redirect(suffix ? `/animate/instant?${suffix}` : "/animate/instant");
  }
  const category = qs.get("category");
  redirect(category ? `/motion?category=${category}` : "/motion");
}
