/**
 * Clothing & appearance — only expose when backed by masked OpenAI replace.
 */

import { actionEditReadiness } from "@/lib/editor-ux-cleanup";
import { isHumanActionHidden } from "@/lib/editor-broken-features";

export type ClothingAppearanceRow = {
  feature: string;
  exposed: boolean;
  backedByPixels: boolean;
  note: string;
};

export const CLOTHING_APPEARANCE_AUDIT: ClothingAppearanceRow[] = [
  {
    feature: "Change jacket color",
    exposed: false,
    backedByPixels: true,
    note: "Available via masked replace when user has selection — no dedicated clothing UI",
  },
  {
    feature: "Change jacket style",
    exposed: false,
    backedByPixels: false,
    note: "change_clothing hidden — no clothing-specific inpaint model",
  },
  {
    feature: "Change shirt / hat / logo on clothing",
    exposed: false,
    backedByPixels: true,
    note: "Generic replace with mask only",
  },
  {
    feature: "Change expression",
    exposed: false,
    backedByPixels: false,
    note: "Hidden — placeholder readiness",
  },
  {
    feature: "Body designer sliders",
    exposed: true,
    backedByPixels: false,
    note: "Adjusts metadata only — does not repaint pixels; kept in advanced mode",
  },
];

export function clothingFeaturesRemainHidden(): boolean {
  return (
    isHumanActionHidden("change_clothing") &&
    isHumanActionHidden("change_expression") &&
    isHumanActionHidden("edit_appearance") &&
    actionEditReadiness("change_clothing") === "placeholder"
  );
}
