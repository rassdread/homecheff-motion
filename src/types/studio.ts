/**
 * Lightweight Studio domain models (V1).
 * No persistence layer yet — types only, to prepare future CRUD and APIs.
 */

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
