import { DocumentStatus } from './documents';

export interface CabinetOption {
  id: number;
  name: string;
  room_id: number;
  shelves?: { id: number; name: string }[];
}

export interface FiltersResponse {
  rooms: { id: number; name: string }[];
  cabinets: CabinetOption[];
  statuses: DocumentStatus[];
}

export interface DocumentQueryState {
  page: number;
  from_date: string;
  to_date: string;
  cabinet_id: string;
  shelf_id: string;
  search: string;
}

export interface DocumentPageMeta {
  total: number;
  lastPage: number;
  from: number;
  to: number;
}
