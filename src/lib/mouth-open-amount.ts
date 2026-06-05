import type { MouthMovementState } from "@/types/studio-character-performance";

/** Export / overlay mapping (V34.5 spec). */
export function mouthOpenAmountFromMouthState(state: MouthMovementState): number {
  switch (state) {
    case "closed":
      return 0;
    case "small":
      return 0.25;
    case "medium":
      return 0.6;
    case "wide":
      return 1;
    default:
      return 0.25;
  }
}
