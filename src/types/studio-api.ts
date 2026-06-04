import type { StudioCharacterRole } from "@/lib/studio-character-roles";
import type { StudioLocationCategory } from "@/lib/studio-location-categories";
import type { StudioPropCategory } from "@/lib/studio-prop-categories";

export type StudioCharacterListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  role: StudioCharacterRole;
  description: string;
  personality: string;
  referenceImageUrl: string;
  isMascot: boolean;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioCharacterDetail = StudioCharacterListItem & {
  referenceStorageKey: string;
  isSystemCharacter: boolean;
};

export type StudioCharacterListResponse = {
  characters: StudioCharacterListItem[];
};

export type StudioCharacterDetailResponse = {
  character: StudioCharacterDetail;
};

export type StudioLocationListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: StudioLocationCategory;
  description: string;
  referenceImageUrl: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioLocationDetail = StudioLocationListItem & {
  referenceStorageKey: string;
  isSystemLocation: boolean;
};

export type StudioLocationListResponse = {
  locations: StudioLocationListItem[];
};

export type StudioLocationDetailResponse = {
  location: StudioLocationDetail;
};

export type StudioPropListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: StudioPropCategory;
  description: string;
  referenceImageUrl: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioPropDetail = StudioPropListItem & {
  referenceStorageKey: string;
  isSystemProp: boolean;
};

export type StudioPropListResponse = {
  props: StudioPropListItem[];
};

export type StudioPropDetailResponse = {
  prop: StudioPropDetail;
};
