export type DocumentStatus = 'available' | 'taken' | 'returned' | 'removed';

export interface MinimalRelation {
  id: number;
  name: string;
}

export interface DocumentRecord {
  id: string | number;
  reference: string;
  name: string;
  status: DocumentStatus;
  area?: string;
  shelf?: string;
  shelf_label?: string | null;
  docket?: number | null;
  side?: 'L' | 'R' | null;
  row?: number | null;
  column?: number | null;
  row_index?: number | null;
  column_index?: number | null;
  metadata?: Record<string, unknown> | null;
  file_url?: string | null;
  file_original_name?: string | null;
  has_file?: boolean;
  created_at?: string;
  updated_at?: string;
  cabinet?: MinimalRelation | null;
  shelfMeta?: MinimalRelation | null;
  room?: MinimalRelation | null;
}

export interface DocumentStatusHistoryEntry {
  id: number;
  status: DocumentStatus;
  note?: string | null;
  created_at: string;
  updated_at?: string;
  user?: MinimalRelation | null;
}
