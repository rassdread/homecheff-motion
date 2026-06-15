export type EditorReferenceRoleFlowStep =
  | "reference_roles"
  | "classify"
  | "dynamic_questions"
  | "output_type"
  | "motion_upsell"
  | "plan_review";

/** Whether the short-lived "reference added" toast should render. */
export function referenceAddedToastVisible(
  step: EditorReferenceRoleFlowStep,
  recentlyAddedCount: number | undefined | null
): boolean {
  return step === "reference_roles" && (recentlyAddedCount ?? 0) > 0;
}
