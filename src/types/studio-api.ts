import type { StudioCharacterRole } from "@/lib/studio-character-roles";

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
