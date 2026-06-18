import { permanentRedirect } from "next/navigation";

/**
 * Consolidates Motion marketing URL with the canonical image-to-video route.
 * Deep-link entry points use /motion/start → /animate/instant.
 */
export default function MotionPage() {
  permanentRedirect("/animate/instant");
}
