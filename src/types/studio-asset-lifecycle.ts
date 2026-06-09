/** Asset lifecycle — hide, archive, delete eligibility and API payloads. */

export type AssetRemoveMode = "hide" | "archive" | "delete";

export type AssetLifecycleManifestStatus = "active" | "hidden" | "archived" | "removed";

export type AssetLifecycleManifestFields = {
  hideFromLibrary?: boolean;
  hiddenAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
  lifecycleStatus?: AssetLifecycleManifestStatus;
};

export type StudioAssetKind =
  | "upload"
  | "generated_reference"
  | "character"
  | "prop"
  | "location"
  | "world"
  | "audio"
  | "voice"
  | "video";

export type AssetRemoveRequest = {
  assetId: string;
  assetKind: StudioAssetKind;
  storageKey?: string | null;
  removeMode: AssetRemoveMode;
};

export type AssetRemoveEligibility =
  | "hard_delete"
  | "soft_hide"
  | "archive_only"
  | "in_use"
  | "system_protected";

export type AssetRegistryUsageRef = {
  entityType: string;
  entityId: string;
  entityName: string;
  href?: string;
};

export type AssetRegistryUsageReport = {
  assetId: string;
  usageCount: number;
  refs: AssetRegistryUsageRef[];
};

export type AssetRemoveResult = {
  ok: boolean;
  mode: AssetRemoveMode;
  applied: boolean;
  eligibility: AssetRemoveEligibility;
  usageCount: number;
  messageKey: string;
};

export type AssetRemoveApiResponse = AssetRemoveResult;
