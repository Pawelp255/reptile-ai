/**
 * Community Foundation — data models for future community features.
 *
 * These types are NOT wired to a backend yet. They prepare the
 * data layer so the community can be built incrementally.
 */

export interface CommunityTip {
  id: string;
  authorId: string;
  authorName: string;
  species: string;
  title: string;
  body: string;
  tags: string[];
  upvotes: number;
  createdAt: string;
}

export interface BreedingLineage {
  id: string;
  ownerId: string;
  reptileId: string;
  sireId?: string;
  damId?: string;
  generation: number;
  morphTraits: string[];
  notes?: string;
  createdAt: string;
}

export interface QAPost {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  species?: string;
  tags: string[];
  answers: QAAnswer[];
  resolved: boolean;
  createdAt: string;
}

export interface QAAnswer {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  upvotes: number;
  accepted: boolean;
  createdAt: string;
}
