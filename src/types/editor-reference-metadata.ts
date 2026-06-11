export const EDITOR_REFERENCE_VIEWS = [
  "front",
  "back",
  "left_side",
  "right_side",
  "three_quarter",
  "detail",
  "full_body",
  "portrait",
] as const;

export type EditorReferenceView = (typeof EDITOR_REFERENCE_VIEWS)[number];

export const EDITOR_CLOTHING_TYPES = [
  "jacket",
  "shirt",
  "t_shirt",
  "dress",
  "skirt",
  "pants",
  "shorts",
  "shoes",
  "socks",
  "hat",
  "bag",
  "accessory",
  "other",
] as const;

export type EditorClothingType = (typeof EDITOR_CLOTHING_TYPES)[number];

export const EDITOR_FAMILY_REFERENCE_TYPES = [
  "mother",
  "father",
  "grandmother_mother_side",
  "grandfather_mother_side",
  "grandmother_father_side",
  "grandfather_father_side",
  "sibling",
  "custom",
] as const;

export type EditorFamilyReferenceType = (typeof EDITOR_FAMILY_REFERENCE_TYPES)[number];

export const EDITOR_ANIMAL_TYPES = [
  "dog",
  "cat",
  "horse",
  "bird",
  "wolf",
  "lion",
  "other",
] as const;

export type EditorAnimalType = (typeof EDITOR_ANIMAL_TYPES)[number];

export type EditorReferenceMetadata = {
  role?: string;
  view?: EditorReferenceView;
  clothingType?: EditorClothingType;
  familyType?: EditorFamilyReferenceType;
  animalType?: EditorAnimalType;
  priority?: number;
  notes?: string;
};

export type EditorReferenceAssignment = {
  roleId: string;
  role: string;
  instanceId: string;
  url: string;
  name: string;
  friendlyName?: string;
  metadata?: EditorReferenceMetadata;
};
