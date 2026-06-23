export type Status = "active" | "archived" | "deleted";
export type Visibility = "public" | "private" | "internal";

export type BaseDocument = {
  id: string;
  slug?: string;
  status: Status;
  visibility?: Visibility;
  sourceIds?: string[];
  photoIds?: string[];
  tags?: string[];
  completeness?: number;
  completenessDetails?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  version: number;
};
