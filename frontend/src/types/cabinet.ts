export interface Shelf {
  id: number;
  name: string;
  column_index: number;
  row_index?: number | null;
  is_open: boolean;
  is_controller?: boolean;
  cabinet_id: number;
  room_id?: number | null;
  panel_id?: number | null;
  open_command?: string | null;
  close_command?: string | null;
  shelf_number?: number | null;
  rows?: number | null;
  columns?: number | null;
  controller?: string | null;
}

export interface Cabinet {
  id: number;
  name: string;
  ip_address: string;
  port: number;
  function_byte: string;
  checksum_offset: number;
  shelf_count?: number | null;
  total_rows?: number | null;
  total_columns?: number | null;
  controller_row?: number | null;
  controller_column?: number | null;
  room_id: number;
  is_active: boolean;
  is_connected?: boolean;
  last_seen?: string | null;
  shelves?: Shelf[];
}

export interface Room {
  id: number;
  name: string;
}
