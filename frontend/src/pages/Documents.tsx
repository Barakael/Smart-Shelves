import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Download, Filter, PlusCircle, RefreshCw, Search, UploadCloud, X } from 'lucide-react';
import { DocumentRecord, DocumentStatus } from '../types/documents';
import { getApiUrl } from '../config/environment';
import templateUrl from '../resources/images/eShelfTemplate.csv?url';

const API_URL = getApiUrl();
const ITEMS_PER_PAGE = 10;
const DEFAULT_STATUSES: DocumentStatus[] = ['available', 'taken', 'returned', 'removed'];

const TEMPLATE_HEADERS = ['Reference', 'Name', 'Area', 'Shelf', 'Docket', 'Side', 'Row', 'Column', 'Status'];
const TEMPLATE_SAMPLE_ROWS = [
  ['DOC-AREA1-001', 'Payroll Register FY25', 'area-1', 'area-1-shelf-01', 101, 'L', 1, 1, 'available'],
  ['DOC-AREA1-002', 'Facility Keys Bundle', 'area-1', 'area-1-shelf-02', 102, 'R', 1, 2, 'taken'],
  ['DOC-AREA2-001', 'Customer Contracts Q1', 'area-2', 'area-2-shelf-01', 201, 'L', 2, 1, 'returned'],
  ['DOC-AREA2-002', 'Supplier Invoices Jan', 'area-2', 'area-2-shelf-02', 202, 'R', 2, 2, 'available'],
  ['DOC-AREA3-001', 'Archive Box: HR Files', 'area-3', 'area-3-shelf-01', 301, 'L', 3, 1, 'available'],
  ['DOC-AREA3-002', 'Audit Evidence Set', 'area-3', 'area-3-shelf-02', 302, 'R', 3, 2, 'removed'],
  ['DOC-AREA4-001', 'Compliance Certificates', 'area-4', 'area-4-shelf-01', 401, 'L', 4, 1, 'returned'],
  ['DOC-AREA4-002', 'Blueprints Master Copy', 'area-4', 'area-4-shelf-02', 402, 'R', 4, 2, 'available'],
];

type PreparedDocumentPayload = {
  data: Record<string, any>;
  rowNumber: number;
};

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

interface FiltersResponse {
  rooms: { id: number; name: string }[];
  cabinets: CabinetOption[];
  statuses: DocumentStatus[];
}

interface CabinetOption {
  id: number;
  name: string;
  room_id: number;
  shelves?: { id: number; name: string }[];
}

const statusStyles: Record<DocumentStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  taken: 'bg-amber-50 text-amber-800 border border-amber-200',
  returned: 'bg-blue-50 text-blue-800 border border-blue-200',
  removed: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const normalizeStatus = (value?: string): DocumentStatus => {
  const normalized = (value || '').trim().toLowerCase();
  if (normalized === 'taken' || normalized === 'returned' || normalized === 'removed') {
    return normalized;
  }
  return 'available';
};

const normalizeSide = (value?: string) => {
  const normalized = (value || '').trim().toUpperCase();
  if (normalized === 'L' || normalized === 'R') {
    return normalized as 'L' | 'R';
  }
  return undefined;
};

const toNumberOrUndefined = (value?: string | number | null) => {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'manual' | 'csv' | 'excel'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkReport, setBulkReport] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState({
    page: 1,
    from_date: '',
    to_date: '',
    cabinet_id: '',
    shelf_id: '',
    search: '',
  });
  const [pageMeta, setPageMeta] = useState({ total: 0, lastPage: 1, from: 0, to: 0 });
  const [filterOptions, setFilterOptions] = useState<FiltersResponse>({
    rooms: [],
    cabinets: [],
    statuses: DEFAULT_STATUSES,
  });
  const [createForm, setCreateForm] = useState({
    reference: '',
    name: '',
    status: 'available' as DocumentStatus,
    cabinet_id: '',
    shelf_id: '',
    shelf_label: '',
    docket: '',
    side: '',
    row: '',
    column: '',
  });

  const fetchFilters = useCallback(async () => {
    try {
      const { data } = await axios.get<FiltersResponse>(`${API_URL}/documents/filters`);
      setFilterOptions({
        rooms: data.rooms ?? [],
        cabinets: data.cabinets ?? [],
        statuses: data.statuses ?? DEFAULT_STATUSES,
      });
    } catch (err) {
      console.error('Failed to load document filters', err);
    }
  }, []);

  const normalizeDocument = (doc: any): DocumentRecord => ({
    id: doc.id,
    reference: doc.reference,
    name: doc.name,
    status: doc.status,
    area: doc.cabinet?.name?.trim().toLowerCase() || doc.area || '',
    shelf: doc.shelf_label || doc.shelf?.name || '',
    shelf_label: doc.shelf_label || doc.shelf?.name || '',
    docket: doc.docket ?? null,
    side: doc.side ?? null,
    row: doc.row ?? doc.row_index ?? null,
    column: doc.column ?? doc.column_index ?? null,
    row_index: doc.row_index ?? null,
    column_index: doc.column_index ?? null,
    metadata: doc.metadata ?? null,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    cabinet: doc.cabinet ? { id: doc.cabinet.id, name: doc.cabinet.name } : null,
    shelfMeta: doc.shelf ? { id: doc.shelf.id, name: doc.shelf.name } : null,
    room: doc.room ? { id: doc.room.id, name: doc.room.name } : null,
  });

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', query.page.toString());
      params.set('per_page', ITEMS_PER_PAGE.toString());
      if (query.from_date) params.set('from_date', query.from_date);
      if (query.to_date) params.set('to_date', query.to_date);
      if (query.cabinet_id) params.set('cabinet_id', query.cabinet_id);
      if (query.shelf_id) params.set('shelf_id', query.shelf_id);
      if (query.search) params.set('search', query.search);

      const response = await axios.get<PaginatedResponse<any>>(`${API_URL}/documents?${params.toString()}`);
      const payload = response.data;
      const mapped = (payload.data ?? []).map(normalizeDocument);
      setDocuments(mapped);
      setPageMeta({
        total: payload.total ?? mapped.length,
        lastPage: payload.last_page ?? 1,
        from: payload.from ?? 0,
        to: payload.to ?? 0,
      });

      if (payload.current_page && payload.current_page !== query.page) {
        setQuery(prev => ({ ...prev, page: payload.current_page }));
      }
    } catch (err) {
      console.error('Failed to load documents', err);
      setError('Failed to load documents. Please retry.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(prev => ({ ...prev, page: 1, search: searchInput.trim() }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      setBulkReport(null);
      setCreateMode('manual');
      setIsBulkImporting(false);
    }
  }, [isCreateModalOpen]);

  const shelfOptions = useMemo(() => {
    if (!query.cabinet_id) return [];
    const cabinet = filterOptions.cabinets.find(cab => String(cab.id) === query.cabinet_id);
    return cabinet?.shelves ?? [];
  }, [filterOptions.cabinets, query.cabinet_id]);

  const createShelfOptions = useMemo(() => {
    if (!createForm.cabinet_id) return [];
    const cabinet = filterOptions.cabinets.find(cab => String(cab.id) === createForm.cabinet_id);
    return cabinet?.shelves ?? [];
  }, [createForm.cabinet_id, filterOptions.cabinets]);

  const handlePageChange = (direction: 'prev' | 'next') => {
    setQuery(prev => {
      const nextPage = direction === 'prev' ? Math.max(1, prev.page - 1) : Math.min(pageMeta.lastPage, prev.page + 1);
      return { ...prev, page: nextPage };
    });
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDocuments(), fetchFilters()]);
    setIsRefreshing(false);
  };

  const resetCreateForm = () => {
    setCreateForm({
      reference: '',
      name: '',
      status: 'available',
      cabinet_id: '',
      shelf_id: '',
      shelf_label: '',
      docket: '',
      side: '',
      row: '',
      column: '',
    });
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateForm();
    setCreateMode('manual');
    setBulkReport(null);
    setIsBulkImporting(false);
  };

  const handleCreateDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createForm.reference.trim() || !createForm.name.trim() || !createForm.cabinet_id) {
      setError('Reference, name, and cabinet are required.');
      return;
    }

    const payload: Record<string, any> = {
      reference: createForm.reference.trim(),
      name: createForm.name.trim(),
      status: createForm.status,
      cabinet_id: Number(createForm.cabinet_id),
    };

    if (createForm.shelf_id) payload.shelf_id = Number(createForm.shelf_id);
    if (createForm.shelf_label.trim()) payload.shelf_label = createForm.shelf_label.trim();
    if (createForm.docket) payload.docket = Number(createForm.docket);
    if (createForm.side) payload.side = createForm.side as 'L' | 'R';
    if (createForm.row) payload.row_index = Number(createForm.row);
    if (createForm.column) payload.column_index = Number(createForm.column);

    try {
      setIsSubmitting(true);
      setError(null);
      await axios.post(`${API_URL}/documents`, payload);
      setSuccessMessage('Document recorded successfully.');
      closeCreateModal();
      fetchDocuments();
    } catch (err: any) {
      console.error('Failed to create document', err);
      const message = err?.response?.data?.message || 'Unable to create document. Please check the form.';
      setError(typeof message === 'string' ? message : 'Unable to create document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapRecordsToPayloads = (records: Record<string, string>[]) => {
    const prepared: PreparedDocumentPayload[] = [];
    const rowErrors: string[] = [];

    records.forEach((record, index) => {
      const rowNumber = index + 2;
      const reference = (record.reference || '').trim();
      const name = (record.name || '').trim();
      const cabinetName = (record.area || record.cabinet || '').trim().toLowerCase();

      if (!reference || !name) {
        rowErrors.push(`Row ${rowNumber}: Reference and name are required.`);
        return;
      }
      if (!cabinetName) {
        rowErrors.push(`Row ${rowNumber}: Area / cabinet is required.`);
        return;
      }

      const cabinet = filterOptions.cabinets.find(cab => cab.name.trim().toLowerCase() === cabinetName);
      if (!cabinet) {
        rowErrors.push(`Row ${rowNumber}: Cabinet "${record.area || record.cabinet}" not found.`);
        return;
      }

      const payload: Record<string, any> = {
        reference,
        name,
        cabinet_id: cabinet.id,
        status: normalizeStatus(record.status),
      };

      const shelfLabel = (record.shelf || '').trim();
      if (shelfLabel) {
        payload.shelf_label = shelfLabel;
        const shelf = cabinet.shelves?.find(item => item.name?.trim().toLowerCase() === shelfLabel.toLowerCase());
        if (shelf) {
          payload.shelf_id = shelf.id;
        }
      }

      const docket = toNumberOrUndefined(record.docket);
      if (docket !== undefined) payload.docket = docket;
      const rowIndex = toNumberOrUndefined(record.row);
      if (rowIndex !== undefined) payload.row_index = rowIndex;
      const columnIndex = toNumberOrUndefined(record.column);
      if (columnIndex !== undefined) payload.column_index = columnIndex;
      const side = normalizeSide(record.side);
      if (side) payload.side = side;

      prepared.push({ data: payload, rowNumber });
    });

    return { prepared, rowErrors };
  };

  const importBulkDocuments = async (prepared: PreparedDocumentPayload[], validationErrors: string[]) => {
    if (!prepared.length && validationErrors.length) {
      setBulkReport(validationErrors.join('\n'));
      return;
    }

    setIsBulkImporting(true);
    setError(null);

    const failureMessages = [...validationErrors];
    let successCount = 0;

    for (const item of prepared) {
      try {
        await axios.post(`${API_URL}/documents`, item.data);
        successCount++;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to import document.';
        failureMessages.push(`Row ${item.rowNumber}: ${message}`);
      }
    }

    if (successCount) {
      await fetchDocuments();
      setSuccessMessage(`${successCount} document${successCount === 1 ? '' : 's'} imported successfully.`);
    }

    const summary: string[] = [`Imported ${successCount} row${successCount === 1 ? '' : 's'}.`];
    if (failureMessages.length) {
      summary.push(`${failureMessages.length} issue${failureMessages.length === 1 ? '' : 's'} detected:`);
      summary.push(...failureMessages);
    }

    setBulkReport(summary.join('\n'));
    setIsBulkImporting(false);
  };

  const ingestStructuredRows = async (rows: (string | number)[][]) => {
    if (!rows.length) {
      setBulkReport('Uploaded file does not contain any data.');
      return;
    }

    const sanitized = rows.map(row => row.map(cell => (cell ?? '').toString().trim()));
    const [headerRow, ...dataRows] = sanitized;

    if (!headerRow || !headerRow.length) {
      setBulkReport('Uploaded file is missing a header row.');
      return;
    }

    const headers = headerRow.map(cell => cell.toLowerCase());
    const records = dataRows
      .filter(row => row.some(cell => cell.length > 0))
      .map(row => {
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (!header) return;
          record[header] = row[index] || '';
        });
        return record;
      });

    if (!records.length) {
      setBulkReport('No data rows detected in the uploaded file.');
      return;
    }

    const { prepared, rowErrors } = mapRecordsToPayloads(records);
    await importBulkDocuments(prepared, rowErrors);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as (string | number)[][];
      await ingestStructuredRows(rows);
    } catch (err) {
      console.error('Unable to parse CSV file', err);
      setBulkReport('Unable to parse CSV file. Ensure it matches the template.');
    } finally {
      event.target.value = '';
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as (string | number)[][];
      await ingestStructuredRows(rows);
    } catch (err) {
      console.error('Unable to parse Excel file', err);
      setBulkReport('Unable to parse Excel file. Please ensure it is a valid .xlsx workbook.');
    } finally {
      event.target.value = '';
    }
  };

  const downloadExcelTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');
    XLSX.writeFile(workbook, 'SmartShelvesDocumentsTemplate.xlsx');
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Documents</h1>
          <p className="text-gray-600 dark:text-gray-400">Auditable list of every stored file per cabinet.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search reference or name..."
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#012169]"
            />
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#012169] px-4 py-2 text-sm font-semibold text-white shadow"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f4cde] px-4 py-2 text-sm font-semibold text-white shadow"
          >
            <PlusCircle className="w-4 h-4" />
            Add Document
          </button>
        </div>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow dark:border-gray-800 dark:bg-gray-900/80"
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Cabinet</label>
              <select
                value={query.cabinet_id}
                onChange={(event) => setQuery(prev => ({ ...prev, page: 1, cabinet_id: event.target.value, shelf_id: '' }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              >
                <option value="">All cabinets</option>
                {filterOptions.cabinets.map(cabinet => (
                  <option key={cabinet.id} value={cabinet.id}>{cabinet.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Shelf</label>
              <select
                value={query.shelf_id}
                onChange={(event) => setQuery(prev => ({ ...prev, page: 1, shelf_id: event.target.value }))}
                disabled={!query.cabinet_id || shelfOptions.length === 0}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">All shelves</option>
                {shelfOptions.map(shelf => (
                  <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">From</label>
              <input
                type="date"
                value={query.from_date}
                onChange={(event) => setQuery(prev => ({ ...prev, page: 1, from_date: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">To</label>
              <input
                type="date"
                value={query.to_date}
                onChange={(event) => setQuery(prev => ({ ...prev, page: 1, to_date: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
              />
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#012169]/20 border-t-[#012169]" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-gray-200 bg-white/95 shadow-lg dark:border-gray-800 dark:bg-gray-900/80"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Cabinet</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Shelf</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Docket / Side</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {documents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-12 text-center text-sm text-gray-500" colSpan={7}>
                      No documents match the selected filters.
                    </td>
                  </tr>
                ) : (
                  documents.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.reference}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{doc.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{doc.cabinet?.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex flex-col">
                          <span>{doc.shelf || '—'}</span>
                          {(doc.row ?? doc.column) !== null && (
                            <span className="text-xs text-gray-500">Row {doc.row ?? '—'} · Col {doc.column ?? '—'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex flex-col">
                          <span>Docket {doc.docket ?? '—'}</span>
                          <span>Side {doc.side ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[doc.status]}`}>
                          {doc.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatDate(doc.updated_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300 md:flex-row md:items-center md:justify-between">
            <p>
              Showing {documents.length ? `${pageMeta.from || 0}-${pageMeta.to || documents.length}` : 0} of {pageMeta.total} records
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange('prev')}
                disabled={query.page === 1}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700"
              >
                Previous
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Page {query.page} of {pageMeta.lastPage}
              </span>
              <button
                onClick={() => handlePageChange('next')}
                disabled={query.page >= pageMeta.lastPage || documents.length === 0}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Document</h2>
                <p className="text-sm text-gray-500">Record a single folder or bulk import from templates.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-full p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              {[
                { key: 'manual', label: 'Manual Entry' },
                { key: 'csv', label: 'Upload CSV' },
                { key: 'excel', label: 'Upload Excel' },
              ].map(mode => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setCreateMode(mode.key as 'manual' | 'csv' | 'excel')}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    createMode === mode.key
                      ? 'bg-[#012169] text-white border-[#012169]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {createMode === 'manual' ? (
              <form className="space-y-4" onSubmit={handleCreateDocument}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Reference *</label>
                    <input
                      type="text"
                      value={createForm.reference}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, reference: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name *</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, name: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cabinet *</label>
                    <select
                      value={createForm.cabinet_id}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, cabinet_id: event.target.value, shelf_id: '' }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                      required
                    >
                      <option value="">Select cabinet</option>
                      {filterOptions.cabinets.map(cabinet => (
                        <option key={cabinet.id} value={cabinet.id}>{cabinet.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shelf</label>
                    <select
                      value={createForm.shelf_id}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, shelf_id: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                      disabled={!createForm.cabinet_id || createShelfOptions.length === 0}
                    >
                      <option value="">Optional</option>
                      {createShelfOptions.map(shelf => (
                        <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shelf label</label>
                    <input
                      type="text"
                      value={createForm.shelf_label}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, shelf_label: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
                    <select
                      value={createForm.status}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, status: event.target.value as DocumentStatus }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      {DEFAULT_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Docket</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.docket}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, docket: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Side</label>
                    <select
                      value={createForm.side}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, side: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                    >
                      <option value="">Select</option>
                      <option value="L">L</option>
                      <option value="R">R</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Row</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.row}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, row: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Column</label>
                    <input
                      type="number"
                      min="0"
                      value={createForm.column}
                      onChange={(event) => setCreateForm(prev => ({ ...prev, column: event.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#012169] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isSubmitting ? 'Saving…' : 'Save Document'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload the template with columns {TEMPLATE_HEADERS.join(', ')}. The sample already lists areas area-1 through area-4 with their shelves.
                </p>
                {bulkReport && (
                  <pre className="max-h-48 overflow-y-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {bulkReport}
                  </pre>
                )}
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center text-sm font-semibold text-[#012169] hover:border-[#012169]">
                  <UploadCloud className="h-6 w-6" />
                  <span>{isBulkImporting ? 'Importing…' : createMode === 'csv' ? 'Choose CSV File' : 'Choose Excel File'}</span>
                  <input
                    type="file"
                    accept={createMode === 'csv' ? '.csv' : '.xlsx,.xls'}
                    className="hidden"
                    onChange={createMode === 'csv' ? handleCsvUpload : handleExcelUpload}
                    disabled={isBulkImporting}
                  />
                </label>
                <div className="flex flex-wrap gap-3 text-sm font-semibold text-[#012169]">
                  <a href={templateUrl} download className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download CSV template
                  </a>
                  <button type="button" onClick={downloadExcelTemplate} className="inline-flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Excel template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
