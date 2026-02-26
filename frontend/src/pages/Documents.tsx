import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Download, Filter, FileArchive, Paperclip, PlusCircle, RefreshCw, Search, Trash2, UploadCloud, X } from 'lucide-react';
import { DocumentRecord, DocumentStatus, DocumentStatusHistoryEntry } from '../types/documents';
import { DocumentPageMeta, DocumentQueryState, FiltersResponse } from '../types/documentsPage';
import DocumentFiltersPanel from '../components/documents/DocumentFiltersPanel';
import DocumentTable from '../components/documents/DocumentTable';
import DocumentDetailModal from '../components/documents/DocumentDetailModal';
import { DEFAULT_STATUSES, statusLabels } from '../components/documents/statusConfig';
import { getApiUrl, getBulkServiceUrl } from '../config/environment';
import templateUrl from '../resources/images/eShelfTemplate.csv?url';

const API_URL = getApiUrl();
const BULK_API_URL = getBulkServiceUrl();
const ITEMS_PER_PAGE = 20;
const STATUS_HISTORY_LIMIT = 3;
const DOCUMENTS_LOAD_ERROR = 'Unable to load documents. Please try again.';

const TEMPLATE_HEADERS = ['Reference', 'Name', 'Area', 'Shelf', 'Docket', 'Side', 'Row', 'Column', 'Status'];
const TEMPLATE_SAMPLE_ROWS = [
  ['DOC-AREA1-001', 'Payroll Register FY25', 'area-1', 'shelf-01', 101, 'L', 1, 1, 'available'],
  ['DOC-AREA1-002', 'Facility Keys Bundle', 'area-1', 'shelf-02', 102, 'R', 1, 2, 'taken'],
  ['DOC-AREA2-001', 'Customer Contracts Q1', 'area-2', 'shelf-01', 201, 'L', 2, 1, 'returned'],
  ['DOC-AREA2-002', 'Supplier Invoices Jan', 'area-2', 'shelf-02', 202, 'R', 2, 2, 'available'],
  ['DOC-AREA3-001', 'Archive Box: HR Files', 'area-3', 'shelf-01', 301, 'L', 3, 1, 'available'],
  ['DOC-AREA3-002', 'Audit Evidence Set', 'area-3', 'shelf-02', 302, 'R', 3, 2, 'removed'],
  ['DOC-AREA4-001', 'Compliance Certificates', 'area-4', 'shelf-01', 401, 'L', 4, 1, 'returned'],
  ['DOC-AREA4-002', 'Blueprints Master Copy', 'area-4', 'shelf-02', 402, 'R', 4, 2, 'available'],
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

type ApiDocumentRecord = Omit<DocumentRecord, 'shelf' | 'shelfMeta'> & {
  shelf?: { id: number; name: string } | string | null;
  shelfMeta?: DocumentRecord['shelfMeta'] | { id: number; name: string } | null;
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

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'manual' | 'upload' | 'pdf'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvReport, setCsvReport] = useState<string | null>(null);
  const [pdfReport, setPdfReport] = useState<string | null>(null);
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [isPdfImporting, setIsPdfImporting] = useState(false);
  const [manualPdfFile, setManualPdfFile] = useState<File | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState<DocumentQueryState>({
    page: 1,
    from_date: '',
    to_date: '',
    cabinet_id: '',
    shelf_id: '',
    search: '',
  });
  const [pageMeta, setPageMeta] = useState<DocumentPageMeta>({ total: 0, lastPage: 1, from: 0, to: 0 });
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
    docket: '',
    side: '',
    row: '',
    column: '',
  });
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);
  const [statusHistory, setStatusHistory] = useState<DocumentStatusHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);
  const [isShelfOpening, setIsShelfOpening] = useState(false);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const isBulkServiceEnabled = Boolean(BULK_API_URL);

  const normalizeDocument = useCallback((record: ApiDocumentRecord): DocumentRecord => {
    const shelfRelation = typeof record.shelf === 'object' && record.shelf !== null ? record.shelf : null;
    const deriveNumber = (value?: number | string | null) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const rowValue = deriveNumber(record.row ?? record.row_index);
    const columnValue = deriveNumber(record.column ?? record.column_index);
    const shelfName =
      record.shelf_label ||
      (typeof record.shelf === 'string' ? record.shelf : null) ||
      shelfRelation?.name ||
      undefined;

    return {
      ...record,
      shelf: shelfName,
      row: rowValue,
      column: columnValue,
      row_index: rowValue,
      column_index: columnValue,
      shelfMeta: record.shelfMeta ?? (shelfRelation ? { id: shelfRelation.id, name: shelfRelation.name } : null),
    };
  }, []);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);

    const params: Record<string, string | number> = {
      page: query.page,
      per_page: ITEMS_PER_PAGE,
    };

    if (query.from_date) params.from_date = query.from_date;
    if (query.to_date) params.to_date = query.to_date;
    if (query.cabinet_id) params.cabinet_id = query.cabinet_id;
    if (query.shelf_id) params.shelf_id = query.shelf_id;
    if (query.search) params.search = query.search;

    try {
      const { data } = await axios.get<PaginatedResponse<ApiDocumentRecord>>(`${API_URL}/documents`, { params });
      const normalized = data.data.map(normalizeDocument);
      setDocuments(normalized);
      setPageMeta({
        total: data.total,
        lastPage: data.last_page || 1,
        from: data.from || 0,
        to: data.to || 0,
      });
      setError(prev => (prev === DOCUMENTS_LOAD_ERROR ? null : prev));
    } catch (err) {
      console.error('Failed to load documents', err);
      setDocuments([]);
      setPageMeta({ total: 0, lastPage: 1, from: 0, to: 0 });
      setError(DOCUMENTS_LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [normalizeDocument, query]);

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

  const handleFilterChange = useCallback((updates: Partial<DocumentQueryState>) => {
    setQuery(prev => {
      const next = { ...prev, ...updates };
      if (updates.cabinet_id !== undefined && !updates.cabinet_id) {
        next.shelf_id = '';
      }
      if (updates.page === undefined) {
        next.page = 1;
      }
      return next;
    });
  }, []);
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
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      setCsvReport(null);
      setPdfReport(null);
      setCreateMode('manual');
      setIsCsvImporting(false);
      setIsPdfImporting(false);
      setManualPdfFile(null);
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

  const fetchDocumentDetails = useCallback(async (documentId: string | number) => {
    try {
      const { data } = await axios.get(`${API_URL}/documents/${documentId}`);
      const normalized = normalizeDocument(data);
      setDocuments(prev => prev.map(doc => (doc.id === normalized.id ? normalized : doc)));
      setSelectedDocument(prev => (prev && prev.id === normalized.id ? normalized : prev));
    } catch (err) {
      console.error('Failed to refresh document', err);
    }
  }, [normalizeDocument]);

  const fetchStatusHistory = useCallback(async (documentId: string | number) => {
    setIsHistoryLoading(true);
    try {
      const { data } = await axios.get<DocumentStatusHistoryEntry[]>(`${API_URL}/documents/${documentId}/status-history`);
      setStatusHistory(data);
    } catch (err) {
      console.error('Failed to load status history', err);
      setModalError('Unable to load status history.');
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const openDocumentDetail = (doc: DocumentRecord) => {
    setSelectedDocument(doc);
    setStatusHistory([]);
    setModalError(null);
    setModalSuccess(null);
    fetchDocumentDetails(doc.id);
    fetchStatusHistory(doc.id);
  };

  const closeDocumentDetail = () => {
    setSelectedDocument(null);
    setStatusHistory([]);
    setModalError(null);
    setModalSuccess(null);
    setIsShelfOpening(false);
  };

  const mapDocumentToForm = (doc: DocumentRecord) => ({
    reference: doc.reference || '',
    name: doc.name || '',
    status: doc.status,
    cabinet_id: doc.cabinet?.id ? String(doc.cabinet.id) : '',
    shelf_id: doc.shelfMeta?.id ? String(doc.shelfMeta.id) : '',
    docket: doc.docket !== null && doc.docket !== undefined ? String(doc.docket) : '',
    side: doc.side || '',
    row: doc.row !== null && doc.row !== undefined ? String(doc.row) : doc.row_index !== null && doc.row_index !== undefined ? String(doc.row_index) : '',
    column:
      doc.column !== null && doc.column !== undefined
        ? String(doc.column)
        : doc.column_index !== null && doc.column_index !== undefined
        ? String(doc.column_index)
        : '',
  });

  const handleEditDocument = (doc: DocumentRecord) => {
    setEditingDocument(doc);
    setCreateMode('manual');
    setCreateForm(mapDocumentToForm(doc));
    setManualPdfFile(null);
    setCsvReport(null);
    setPdfReport(null);
    setIsCreateModalOpen(true);
  };

  const handleArchiveDocument = async (doc: DocumentRecord) => {
    const confirmed = window.confirm(`Archive ${doc.reference}? It will no longer appear in the active list.`);
    if (!confirmed) return;

    try {
      setError(null);
      await axios.delete(`${API_URL}/documents/${doc.id}`);
      setSuccessMessage(`Document ${doc.reference} archived.`);
      if (selectedDocument?.id === doc.id) {
        closeDocumentDetail();
      }
      await fetchDocuments();
    } catch (err: any) {
      console.error('Failed to archive document', err);
      const message = err?.response?.data?.message || 'Unable to archive document.';
      setError(typeof message === 'string' ? message : 'Unable to archive document.');
    }
  };

  const handleShelfOpen = async () => {
    if (!selectedDocument) return;
    if (!selectedDocument.cabinet?.id || !selectedDocument.shelfMeta?.id) {
      setModalError('Shelf metadata is missing for this document.');
      return;
    }

    setIsShelfOpening(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      await axios.post(`${API_URL}/cabinets/${selectedDocument.cabinet.id}/shelves/${selectedDocument.shelfMeta.id}/open`);
      setModalSuccess(`Shelf ${selectedDocument.shelf || selectedDocument.shelfMeta.name || ''} opened successfully.`);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to open shelf.';
      setModalError(message);
    } finally {
      setIsShelfOpening(false);
    }
  };

  const handleStatusChange = async (status: DocumentStatus) => {
    if (!selectedDocument) return;

    setIsStatusUpdating(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      const { data } = await axios.put(`${API_URL}/documents/${selectedDocument.id}`, { status });
      const normalized = normalizeDocument(data);
      setDocuments(prev => prev.map(doc => (doc.id === normalized.id ? normalized : doc)));
      setSelectedDocument(normalized);
      setModalSuccess(`Status updated to ${statusLabels[status]}.`);
      await fetchStatusHistory(normalized.id);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to update status.';
      setModalError(message);
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedDocument) return;

    if (!selectedDocument.has_file) {
      setModalError('No PDF is attached to this document.');
      return;
    }

    try {
      const { data } = await axios.get(`${API_URL}/documents/${selectedDocument.id}/file`, {
        responseType: 'blob',
      });

      const blobUrl = URL.createObjectURL(data);
      const newWindow = window.open(blobUrl, '_blank', 'noopener');

      if (!newWindow) {
        URL.revokeObjectURL(blobUrl);
        setModalError('Popup blocked. Allow popups to view the PDF.');
        return;
      }

      const revoke = () => {
        URL.revokeObjectURL(blobUrl);
        newWindow.removeEventListener('load', revoke);
      };
      newWindow.addEventListener('load', revoke);
    } catch (err: any) {
      console.error('Failed to open document PDF', err);
      const message = err?.response?.data?.message || 'Unable to open document PDF.';
      setModalError(typeof message === 'string' ? message : 'Unable to open document PDF.');
    }
  };

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
      docket: '',
      side: '',
      row: '',
      column: '',
    });
    setManualPdfFile(null);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateForm();
    setCreateMode('manual');
    setCsvReport(null);
    setPdfReport(null);
    setIsCsvImporting(false);
    setIsPdfImporting(false);
    setEditingDocument(null);
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

    const isEditing = Boolean(editingDocument);

    if (createForm.shelf_id) payload.shelf_id = Number(createForm.shelf_id);
    if (createForm.docket) payload.docket = Number(createForm.docket);
    if (createForm.side) payload.side = createForm.side as 'L' | 'R';
    if (createForm.row) payload.row_index = Number(createForm.row);
    if (createForm.column) payload.column_index = Number(createForm.column);

    try {
      setIsSubmitting(true);
      setError(null);

      if (manualPdfFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          formData.append(key, typeof value === 'number' ? String(value) : value);
        });
        formData.append('pdf', manualPdfFile);

        if (isEditing && editingDocument) {
          formData.append('_method', 'PUT');
        }

        const url = isEditing && editingDocument ? `${API_URL}/documents/${editingDocument.id}` : `${API_URL}/documents`;

        await axios.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (isEditing && editingDocument) {
        await axios.put(`${API_URL}/documents/${editingDocument.id}`, payload);
      } else {
        await axios.post(`${API_URL}/documents`, payload);
      }

      setSuccessMessage(isEditing ? 'Document updated successfully.' : 'Document recorded successfully.');
      closeCreateModal();
      await fetchDocuments();
    } catch (err: any) {
      console.error('Failed to submit document form', err);
      const fallbackMessage = isEditing ? 'Unable to update document. Please check the form.' : 'Unable to create document. Please check the form.';
      const message = err?.response?.data?.message || fallbackMessage;
      setError(typeof message === 'string' ? message : fallbackMessage);
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

  const importCsvDocuments = async (prepared: PreparedDocumentPayload[], validationErrors: string[]) => {
    if (!prepared.length && validationErrors.length) {
      setCsvReport(validationErrors.join('\n'));
      return;
    }

    setIsCsvImporting(true);
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

    setCsvReport(summary.join('\n'));
    setIsCsvImporting(false);
  };

  const ingestStructuredRows = async (rows: (string | number)[][]) => {
    if (!rows.length) {
      setCsvReport('Uploaded file does not contain any data.');
      return;
    }

    const sanitized = rows.map(row => row.map(cell => (cell ?? '').toString().trim()));
    const [headerRow, ...dataRows] = sanitized;

    if (!headerRow || !headerRow.length) {
      setCsvReport('Uploaded file is missing a header row.');
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
      setCsvReport('No data rows detected in the uploaded file.');
      return;
    }

    const { prepared, rowErrors } = mapRecordsToPayloads(records);
    await importCsvDocuments(prepared, rowErrors);
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
      setCsvReport('Unable to parse CSV file. Ensure it matches the template.');
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
      setCsvReport('Unable to parse Excel file. Please ensure it is a valid .xlsx workbook.');
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

  const handleManualPdfSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setError('Only PDF files can be attached.');
      event.target.value = '';
      return;
    }

    setManualPdfFile(file);
    event.target.value = '';
  };

  const handleRemoveManualPdf = () => {
    setManualPdfFile(null);
  };

  const handlePdfRoadmapUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!BULK_API_URL) {
      setPdfReport('Bulk PDF service URL is not configured.');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('archive', file);

    try {
      setIsPdfImporting(true);
      setPdfReport('Uploading and processing archive…');
      const { data } = await axios.post(`${BULK_API_URL}/bulk-import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const summaryLines: string[] = [
        `Manifest rows: ${data.total_manifest_rows ?? 'n/a'}`,
        `Imported: ${data.imported_count ?? 0}`,
      ];

      if (Array.isArray(data.skipped_rows) && data.skipped_rows.length) {
        summaryLines.push('Issues:', ...data.skipped_rows.map((issue: string) => `• ${issue}`));
      }

      if (Array.isArray(data.imported_documents) && data.imported_documents.length) {
        summaryLines.push('Imported documents:');
        summaryLines.push(
          ...data.imported_documents.map((doc: any) => `• ${doc.reference || doc.name} (Shelf ${doc.shelf_name ?? doc.shelf_id})`)
        );
      }

      setPdfReport(summaryLines.join('\n'));
      await fetchDocuments();
      setSuccessMessage('Bulk PDF archive processed successfully.');
    } catch (err: any) {
      console.error('Unable to process PDF archive', err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message || 'Bulk PDF upload failed.';
      setPdfReport(`Bulk upload failed: ${detail}`);
    } finally {
      setIsPdfImporting(false);
      event.target.value = '';
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

  const formatStatusTimestamp = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const isEditingExistingDocument = Boolean(editingDocument);
  const submitLabel = isEditingExistingDocument ? 'Update Document' : 'Save Document';
  const submittingLabel = isEditingExistingDocument ? 'Updating…' : 'Saving…';
  const isDocumentUnavailable = selectedDocument ? ['removed', 'taken'].includes(selectedDocument.status) : false;
  const latestRemovalEntry = statusHistory.find(entry => entry.status === 'removed');
  const removalSummary = latestRemovalEntry
    ? `${statusLabels[latestRemovalEntry.status]} ${formatStatusTimestamp(latestRemovalEntry.created_at)}${
        latestRemovalEntry.user ? ` by ${latestRemovalEntry.user.name}` : ''
      }${latestRemovalEntry.note ? ` • ${latestRemovalEntry.note}` : ''}`
    : 'status marked as removed';
  const canOpenShelf = Boolean(
    selectedDocument?.cabinet?.id &&
      selectedDocument?.shelfMeta?.id &&
      !isDocumentUnavailable
  );
  const documentStatusSummary = isDocumentUnavailable
    ? `Physical copy is currently out of the shelf (${removalSummary}).`
    : 'Physical copy is available for retrieval.';

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

      <DocumentFiltersPanel
        visible={showFilters}
        query={query}
        filterOptions={filterOptions}
        shelfOptions={shelfOptions}
        onQueryChange={handleFilterChange}
      />

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
          className="w-full"
        >
          <DocumentTable
            documents={documents}
            pageMeta={pageMeta}
            currentPage={query.page}
            onPageChange={handlePageChange}
            onOpenDocument={openDocumentDetail}
            onEditDocument={handleEditDocument}
            onArchiveDocument={handleArchiveDocument}
            formatDate={formatDate}
          />
        </motion.div>
      )}

      {selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          onClose={closeDocumentDetail}
          modalError={modalError}
          modalSuccess={modalSuccess}
          documentStatusSummary={documentStatusSummary}
          canOpenShelf={canOpenShelf}
          isShelfOpening={isShelfOpening}
          onShelfOpen={handleShelfOpen}
          onDownloadPdf={handleDownloadPdf}
          onStatusChange={handleStatusChange}
          isStatusUpdating={isStatusUpdating}
          statusHistory={statusHistory}
          isHistoryLoading={isHistoryLoading}
          formatStatusTimestamp={formatStatusTimestamp}
          historyLimit={STATUS_HISTORY_LIMIT}
          isDocumentUnavailable={isDocumentUnavailable}
        />
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {isEditingExistingDocument ? 'Edit Document' : 'Add Document'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isEditingExistingDocument ? 'Update metadata or replace the attached PDF.' : 'Record a single folder or bulk import from templates.'}
                </p>
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
                { key: 'upload', label: 'Upload CSV/Excel' },
                { key: 'pdf', label: 'PDF Roadmap' },
              ].map(mode => {
                const isModeDisabled = isEditingExistingDocument && mode.key !== 'manual';
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setCreateMode(mode.key as 'manual' | 'upload' | 'pdf')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      createMode === mode.key
                        ? 'bg-[#012169] text-white border-[#012169]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300'
                    } ${isModeDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={isModeDisabled}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>

            {createMode === 'manual' && (
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

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Attach PDF (optional)</label>
                  {manualPdfFile ? (
                    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800/60">
                      <div className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 dark:text-gray-100">{manualPdfFile.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(manualPdfFile.size)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveManualPdf}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                        aria-label="Remove attached PDF"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-4 text-center text-sm font-semibold text-[#012169] hover:border-[#012169] dark:border-gray-600">
                      <UploadCloud className="h-5 w-5" />
                      <span>Attach PDF</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={handleManualPdfSelection} />
                    </label>
                  )}
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
                    {isSubmitting ? submittingLabel : submitLabel}
                  </button>
                </div>
              </form>
            )}

            {createMode === 'upload' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a CSV or Excel file with columns {TEMPLATE_HEADERS.join(', ')}. The sample already lists areas area-1 through area-4 with their shelves.
                </p>
                {csvReport && (
                  <pre className="max-h-48 overflow-y-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {csvReport}
                  </pre>
                )}
                <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center text-sm font-semibold text-[#012169] hover:border-[#012169]">
                  <UploadCloud className="h-6 w-6" />
                  <span>{isCsvImporting ? 'Importing…' : 'Choose CSV or Excel File'}</span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.name.endsWith('.csv')) {
                        handleCsvUpload(e);
                      } else {
                        handleExcelUpload(e);
                      }
                    }}
                    disabled={isCsvImporting}
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

            {createMode === 'pdf' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a ZIP archive that includes your manifest (.csv/.xlsx) plus every referenced PDF. The manifest must match the Bulk PDF service requirements.
                </p>
                {pdfReport && (
                  <pre className="max-h-48 overflow-y-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {pdfReport}
                  </pre>
                )}
                <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center text-sm font-semibold text-[#012169] hover:border-[#012169]">
                  <FileArchive className="h-6 w-6" />
                  <span>{isPdfImporting ? 'Processing…' : 'Choose ZIP Archive'}</span>
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handlePdfRoadmapUpload}
                    disabled={!isBulkServiceEnabled || isPdfImporting}
                  />
                </label>
                {!isBulkServiceEnabled && (
                  <p className="text-sm text-red-600">
                    Configuration error: Bulk PDF service URL is not set up.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
