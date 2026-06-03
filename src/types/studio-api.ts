import type { StudioCharacterRole } from "@/lib/studio-character-roles";
import type { StudioLocationCategory } from "@/lib/studio-location-categories";

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
