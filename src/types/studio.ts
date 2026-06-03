/**
 * Lightweight Studio domain models for non-character pillars (V1).
 * Characters are persisted — see `@/types/studio-api` and Prisma `StudioCharacter`.
 */

/** @deprecated Use StudioCharacterListItem from `@/types/studio-api` for persisted characters. */
export type StudioCharacter = {
  id: string;
  name: string;
  role: string;
  description: string;
  referenceImageUrl?: string;
  createdAt?: string;
};

export type StudioLocation = {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  createdAt?: string;
};

export type StudioProp = {
  id: string;
  name: string;
  category: string;
  imageUrl?: string;
  createdAt?: string;
};

export type StudioStoryboard = {
  id: string;
  title: string;
  description: string;
  createdAt?: string;
};
