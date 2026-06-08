/** Asset visibility for My Assets, pickers, and dashboard counts. */

export type StudioAssetVisibility =
  | "user_owned"
  | "system_usable"
  | "system_hidden"
  | "admin_only"
  | "placeholder";

export type StudioAssetPickerContext =
  | "library_all"
  | "reference_image"
  | "voice"
  | "music"
  | "sound"
  | "character"
  | "prop"
  | "location"
  | "world";

export type UserLibraryFilterOptions = {
  userId: string;
  isAdmin?: boolean;
  /** Admin-only: include system catalog rows in library view. */
  showSystemAssets?: boolean;
  pickerContext?: StudioAssetPickerContext;
};
