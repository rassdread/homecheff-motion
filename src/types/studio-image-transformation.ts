/**
 * S2B.1 — Canonical image transformation intent & routing contracts.
 * Runtime typed layer only. No Prisma schema. Not a competing UPC store.
 */

export const IMAGE_TRANSFORMATION_VERSION = "s2b.1" as const;

export type ImageTransformationRole =
  | "BASE"
  | "IDENTITY_REFERENCE"
  | "FACE_REFERENCE"
  | "BODY_REFERENCE"
  | "CLOTHING_REFERENCE"
  | "LOCATION_REFERENCE"
  | "PRODUCT_REFERENCE"
  | "LOGO_REFERENCE"
  | "STYLE_REFERENCE"
  | "POSE_REFERENCE"
  | "COMPOSITION_REFERENCE"
  | "OBJECT_REFERENCE";

export type ImageTransformationOperation =
  | "IDENTITY_PRESERVING_EDIT"
  | "CLOTHING_TRANSFER"
  | "OBJECT_TRANSFER"
  | "PRODUCT_PRESERVE"
  | "LOGO_PRESERVE"
  | "BACKGROUND_REPLACE"
  | "LOCATION_TRANSFER"
  | "POSE_CHANGE"
  | "CAMERA_REFRAME"
  | "EXPRESSION_CHANGE"
  | "HAIR_CHANGE"
  | "STYLE_CHANGE"
  | "FULL_SCENE_GENERATION"
  | "CHARACTER_REFERENCE_GENERATION"
  | "MULTI_CHARACTER_COMPOSITION"
  | "SCENE_RERENDER"
  | "MOTION_ONLY";

export type ImageTransformationOrigin =
  | "FUSION_WIZARD"
  | "EXPERIENCE_PACK"
  | "MOTION_PRESET"
  | "CHARACTER_DESIGNER"
  | "SCENE_RERENDER"
  | "EDITOR_INSTRUCTION"
  | "COMMERCIAL_FLOW"
  | "HC_CONTEXT"
  | "DIRECTOR"
  | "MORPH"
  | "LEGACY";

export type ImageTransformationFamily =
  | "PERSON_TRANSFORM"
  | "OUTFIT"
  | "LOCATION_BACKGROUND"
  | "STYLE"
  | "SOCIAL_FUN"
  | "RED_CARPET_CELEBRITY"
  | "COMMERCIAL_PRODUCT"
  | "LOGO_BRANDING"
  | "CHARACTER"
  | "STORY_CINEMATIC"
  | "MOTION_ONLY"
  | "OBJECT_PROP"
  | "MULTI_PERSON"
  | "NOT_TRANSFORMATION_RELEVANT";

export type ImageProtectionLevel =
  | "MUST_PRESERVE"
  | "SHOULD_PRESERVE"
  | "CAN_CHANGE"
  | "MUST_NOT_IMPORT_FROM_REFERENCE";

export type ImageChangeTarget =
  | "clothing.outerwear"
  | "clothing"
  | "expression"
  | "background"
  | "location"
  | "pose"
  | "camera.crop"
  | "hair"
  | "style"
  | "product.placement"
  | "logo.placement"
  | "object"
  | "identity.merge"
  | "scene.delta";

export type ImageMaskRegionKind =
  | "CLOTHING_REGION"
  | "FACE_REGION"
  | "PERSON_FOREGROUND"
  | "PRODUCT_REGION"
  | "LOGO_PLACEMENT"
  | "HAIR_REGION"
  | "OBJECT_REGION";

export type ImageTransformationRoute =
  | "TEXT_TO_IMAGE"
  | "BASE_IMAGE_EDIT"
  | "MULTI_REFERENCE_EDIT"
  | "MASKED_EDIT"
  | "MASKED_MULTI_REFERENCE_EDIT"
  | "SEGMENT_COMPOSITE_EDIT"
  | "PIXEL_COMPOSITE"
  | "COMMERCIAL_INJECT"
  | "FUSION"
  | "LEGACY_ADAPTER";

export type ImagePromptPolicy =
  | "DELTA_ONLY"
  | "PRESERVE_BASE"
  | "TRANSFER_REFERENCE_ATTRIBUTE"
  | "PROTECT_IDENTITY"
  | "DO_NOT_IMPORT_REFERENCE_IDENTITY";

export type ImageTransformationAsset = {
  assetId: string;
  role: ImageTransformationRole;
  /** Sanitized host+path only — never signed query. */
  pointer: string | null;
  sourceEntityId?: string | null;
  sourceSlotId?: string;
  required: boolean;
  transferAllowed: string[];
  exactness?: "MUST_PRESERVE" | "SHOULD_MATCH" | "STYLE_REFERENCE_ONLY";
};

export type ImageProtectionRule = {
  property: string;
  level: ImageProtectionLevel;
};

export type ImageTransferRule = {
  referenceRole: ImageTransformationRole;
  transfer: string[];
  doNotTransfer: string[];
};

export type ImageMaskHint = {
  region: ImageMaskRegionKind;
  purpose: ImageTransformationOperation | "protect" | "change";
  pointer?: string | null;
  source?: "segmentation" | "user" | "inferred";
  confidence?: number;
};

export type ImageTransformationIntent = {
  version: typeof IMAGE_TRANSFORMATION_VERSION;
  operation: ImageTransformationOperation;
  origin: ImageTransformationOrigin;
  family: ImageTransformationFamily;
  baseAsset: ImageTransformationAsset | null;
  references: ImageTransformationAsset[];
  changeTargets: ImageChangeTarget[];
  protectedTargets: ImageProtectionRule[];
  transferRules: ImageTransferRule[];
  negativeTransferRules: ImageTransferRule[];
  masks: ImageMaskHint[];
  styleIntent?: string | null;
  compositionIntent?: string | null;
  sourceWizard?: string | null;
  sourcePreset?: string | null;
  upcHash?: string | null;
  sceneContextHash?: string | null;
  allowTextOnlyFallback?: boolean;
  providerDriftRisk?: "LOW" | "MEDIUM" | "HIGH";
};

export type TransformationRuntimeCapabilities = {
  supportsBaseEdit: boolean;
  supportsMultiReference: boolean;
  supportsMask: boolean;
  supportsPixelComposite: boolean;
  supportsCommercialInject: boolean;
  stillReferenceEditEnabled: boolean;
  maxReferenceImages: number;
};

export type TransformationPlanStatus =
  | "ready"
  | "missing_required_reference"
  | "legacy_inferred"
  | "not_transformation_relevant";

export type TransformationPlan = {
  version: typeof IMAGE_TRANSFORMATION_VERSION;
  status: TransformationPlanStatus;
  operation: ImageTransformationOperation;
  origin: ImageTransformationOrigin;
  family: ImageTransformationFamily;
  requestedRoute: ImageTransformationRoute;
  actualRoute: ImageTransformationRoute | null;
  adapter: string;
  base: ImageTransformationAsset | null;
  references: ImageTransformationAsset[];
  droppedReferences: ImageTransformationAsset[];
  masks: ImageMaskHint[];
  needsMask: ImageMaskRegionKind[];
  providerMode: string;
  requiredCapabilities: string[];
  protectionPolicy: ImageProtectionRule[];
  promptPolicy: ImagePromptPolicy[];
  postProcess: Array<"PIXEL_COMPOSITE" | "COMMERCIAL_INJECT" | "NONE">;
  qaHooks: string[];
  motionHints: string[];
  compositeReferenceRecommended: boolean;
  missingRequired: ImageTransformationRole[];
  downgradeReason: string | null;
  protectionLost: string[];
  unsupportedCapabilities: string[];
  providerDriftRisk: "LOW" | "MEDIUM" | "HIGH";
};

export type TransformationTrace = {
  operation: ImageTransformationOperation;
  origin: ImageTransformationOrigin;
  family: ImageTransformationFamily;
  baseAssetId: string | null;
  referenceRoles: ImageTransformationRole[];
  changeTargets: ImageChangeTarget[];
  protectedTargets: string[];
  requestedRoute: ImageTransformationRoute;
  actualRoute: ImageTransformationRoute | null;
  providerMode: string;
  maskUsage: ImageMaskRegionKind[];
  downgradeReason: string | null;
  upcHash: string | null;
  sceneContextHash: string | null;
  status: TransformationPlanStatus;
};

export type ClothingMaskStatus =
  | "MASK_VALID"
  | "MASK_LOW_CONFIDENCE"
  | "MASK_INVALID"
  | "MASK_UNAVAILABLE";

export type ClothingTransformationQaBand = "PASS" | "WARN" | "FAIL" | "UNKNOWN";

export type ClothingTransformationQa = {
  identityPreservation: ClothingTransformationQaBand;
  requestedTransfer: ClothingTransformationQaBand;
  protectionIntegrity: ClothingTransformationQaBand;
  negativeTransferLeak: ClothingTransformationQaBand;
  maskIntegrity: ClothingTransformationQaBand;
};

/** S2B.4 — extended operation-aware QA attached alongside legacy clothing QA. */
export type TransformQaSnapshot = {
  overall: ClothingTransformationQaBand;
  recommendedEscalation: string;
  checkedDimensions: string[];
  productPreservation: ClothingTransformationQaBand;
  logoPreservation: ClothingTransformationQaBand;
  secondaryIdentityPreservation: ClothingTransformationQaBand;
  locationMatch: ClothingTransformationQaBand;
  clothingTransferMatch: ClothingTransformationQaBand;
};

export type TransformationExecutionRecord = {
  version: typeof IMAGE_TRANSFORMATION_VERSION;
  operation: ImageTransformationOperation;
  origin: ImageTransformationOrigin;
  requestedRoute: ImageTransformationRoute;
  actualRoute: ImageTransformationRoute | null;
  downgradeReason: string | null;
  protectionLost: string[];
  maskStatus: ClothingMaskStatus;
  maskStorageKey: string | null;
  maskRequested?: boolean;
  maskUsed?: boolean;
  baseAssetId: string | null;
  clothingReferenceAssetId: string | null;
  /** S2B.3 — approved StudioSceneImage used as visual BASE. */
  baseSceneImageId?: string | null;
  /** S2B.3 — location/background reference asset when used. */
  locationReferenceAssetId?: string | null;
  /** S2B.4 */
  productReferenceAssetId?: string | null;
  logoReferenceAssetId?: string | null;
  referenceRoles?: ImageTransformationRole[];
  referenceBudget?: number;
  droppedReferenceRoles?: ImageTransformationRole[];
  exactnessRequirements?: string[];
  providerMode: string;
  providerModel: string | null;
  providerCallCount: number;
  segmentationCallCount: number;
  visionQaCallCount?: number;
  postCompositeCallCount?: number;
  qa: ClothingTransformationQa;
  transformQa?: TransformQaSnapshot;
  upcHash: string | null;
  sceneContextHash: string | null;
  sourcePreset: string | null;
  experienceId?: string | null;
  wizardId?: string | null;
};

export type WizardSlotClassification =
  | "CORRECT"
  | "CORRECT_BUT_UNTYPED"
  | "AMBIGUOUS"
  | "REDUNDANT"
  | "MISSING"
  | "WRONGLY_ROUTED"
  | "WRONGLY_LABELED"
  | "NOT_USED_DOWNSTREAM"
  | "LEGACY";

export type TransformationCoverageStatus =
  | "ROUTER_READY"
  | "READY_BUT_EXECUTION_WEAK"
  | "MISSING_INPUT"
  | "LEGACY"
  | "NOT_TRANSFORMATION_RELEVANT"
  | "BLOCKED"
  | "MASKED_EXECUTION_ACTIVE"
  | "FUSION_FALLBACK_ACTIVE"
  | "GENERATIVE_IDENTITY_EDIT_ACTIVE"
  | "BASE_EDIT_ACTIVE"
  | "LOCATION_REFERENCE_EDIT_ACTIVE"
  | "FOREGROUND_COMPOSITE_ACTIVE"
  | "GENERATIVE_BASE_EDIT_ACTIVE"
  | "FRESH_T2I_LAST_RESORT"
  | "PIXEL_PRESERVE_ACTIVE"
  | "QA_ACTIVE";

export type TransformationCoverageRow = {
  id: string;
  source: ImageTransformationOrigin;
  family: ImageTransformationFamily;
  operation: ImageTransformationOperation | null;
  uploadSlots: Array<{
    slotId: string;
    currentRole: string;
    canonicalRole: ImageTransformationRole | null;
    required: boolean;
    classification: WizardSlotClassification;
  }>;
  roleMapped: boolean;
  baseIdentified: boolean;
  changeIdentified: boolean;
  protectionIdentified: boolean;
  routerPlan: boolean;
  currentExecutionMatchesPlan: boolean;
  nextSlice: string | null;
  status: TransformationCoverageStatus;
};
