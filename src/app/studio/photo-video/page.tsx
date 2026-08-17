import { maybeSilentHydratePublicStudio } from "@/lib/identity/sso/public-hydrate";
import { PhotoVideoPageClient } from "@/app/studio/photo-video/photo-video-page-client";

/**
 * PX.4A.3 — public free creator surface.
 * Silent SSO hydrates an existing HomeCheff session without blocking anonymous use
 * (`mode=public` via isPublicStudioSurface).
 */
export default async function StudioPhotoVideoPage() {
  await maybeSilentHydratePublicStudio("/studio/photo-video");
  return <PhotoVideoPageClient />;
}
