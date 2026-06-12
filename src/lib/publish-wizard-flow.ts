export type PublishWizardStepId =
  | "upload"
  | "intent"
  | "analyze"
  | "proposal"
  | "review"
  | "export";

export const PUBLISH_WIZARD_STEPS: PublishWizardStepId[] = [
  "upload",
  "intent",
  "analyze",
  "proposal",
  "review",
  "export",
];

export const PUBLISH_WIZARD_STEP_LABEL_KEYS: Record<PublishWizardStepId, string> = {
  upload: "publish.wizard.upload",
  intent: "publish.wizard.intent",
  analyze: "publish.wizard.analyze",
  proposal: "publish.wizard.proposal",
  review: "publish.wizard.review",
  export: "publish.wizard.export",
};

export const PUBLISH_WIZARD_STEP_HELP_KEYS: Record<PublishWizardStepId, string> = {
  upload: "publish.wizard.help.upload",
  intent: "publish.wizard.help.intent",
  analyze: "publish.wizard.help.analyze",
  proposal: "publish.wizard.help.proposal",
  review: "publish.wizard.help.review",
  export: "publish.wizard.help.export",
};

export const PUBLISH_WIZARD_STEP_WHY_KEYS: Record<PublishWizardStepId, string> = {
  upload: "publish.wizard.why.upload",
  intent: "publish.wizard.why.intent",
  analyze: "publish.wizard.why.analyze",
  proposal: "publish.wizard.why.proposal",
  review: "publish.wizard.why.review",
  export: "publish.wizard.why.export",
};

export const PUBLISH_WIZARD_STEP_NEXT_KEYS: Record<PublishWizardStepId, string> = {
  upload: "publish.wizard.next.upload",
  intent: "publish.wizard.next.intent",
  analyze: "publish.wizard.next.analyze",
  proposal: "publish.wizard.next.proposal",
  review: "publish.wizard.next.review",
  export: "publish.wizard.next.export",
};

export const PUBLISH_WIZARD_STEP_CONTROL_KEYS: Record<PublishWizardStepId, string> = {
  upload: "publish.wizard.control.upload",
  intent: "publish.wizard.control.intent",
  analyze: "publish.wizard.control.analyze",
  proposal: "publish.wizard.control.proposal",
  review: "publish.wizard.control.review",
  export: "publish.wizard.control.export",
};

export type PublishWizardState = {
  step: PublishWizardStepId;
  intent?: string;
  uploadReady?: boolean;
  analyzeComplete?: boolean;
  proposalReady?: boolean;
  reviewReady?: boolean;
  hcProjectId?: string;
};

export function resolvePublishWizardStepIndex(step: PublishWizardStepId): number {
  return PUBLISH_WIZARD_STEPS.indexOf(step);
}

export function nextPublishWizardStep(step: PublishWizardStepId): PublishWizardStepId | null {
  const index = resolvePublishWizardStepIndex(step);
  return PUBLISH_WIZARD_STEPS[index + 1] ?? null;
}

export function prevPublishWizardStep(step: PublishWizardStepId): PublishWizardStepId | null {
  const index = resolvePublishWizardStepIndex(step);
  return index > 0 ? PUBLISH_WIZARD_STEPS[index - 1]! : null;
}

export function publishWizardStepComplete(state: PublishWizardState, step: PublishWizardStepId): boolean {
  switch (step) {
    case "upload":
      return Boolean(state.uploadReady);
    case "intent":
      return Boolean(state.intent?.trim());
    case "analyze":
      return Boolean(state.analyzeComplete);
    case "proposal":
      return Boolean(state.proposalReady);
    case "review":
      return Boolean(state.reviewReady);
    case "export":
      return true;
    default:
      return false;
  }
}

export function publishWizardCanAdvance(state: PublishWizardState, step: PublishWizardStepId): boolean {
  if (step === "export") return false;
  return publishWizardStepComplete(state, step);
}

export function hydratePublishWizardFromProject(input: {
  publishIntent?: string;
  hcProjectId?: string;
  hasMedia?: boolean;
  hasProposal?: boolean;
}): PublishWizardState {
  if (input.hasProposal) {
    return {
      step: "review",
      intent: input.publishIntent,
      uploadReady: true,
      analyzeComplete: true,
      proposalReady: true,
      reviewReady: true,
      hcProjectId: input.hcProjectId,
    };
  }
  if (input.hasMedia && input.publishIntent) {
    return {
      step: "analyze",
      intent: input.publishIntent,
      uploadReady: true,
      hcProjectId: input.hcProjectId,
    };
  }
  if (input.hasMedia) {
    return {
      step: "intent",
      uploadReady: true,
      hcProjectId: input.hcProjectId,
    };
  }
  return {
    step: "upload",
    hcProjectId: input.hcProjectId,
  };
}

export type PublishModuleId =
  | "voice"
  | "subtitles"
  | "captions"
  | "branding"
  | "music"
  | "cta"
  | "language"
  | "social";

export const PUBLISH_MODULE_LABEL_KEYS: Record<PublishModuleId, string> = {
  voice: "publish.module.voice",
  subtitles: "publish.module.subtitles",
  captions: "publish.module.captions",
  branding: "publish.module.branding",
  music: "publish.module.music",
  cta: "publish.module.cta",
  language: "publish.module.language",
  social: "publish.module.social",
};
