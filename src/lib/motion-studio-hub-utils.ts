import { MOTION_HUB_CATEGORY_IDS, type MotionHubCategoryId } from "@/types/motion-studio-hub";

export function isMotionHubCategoryId(value: string | null): value is MotionHubCategoryId {
  if (!value) {
    return false;
  }
  return (MOTION_HUB_CATEGORY_IDS as readonly string[]).includes(value);
}
