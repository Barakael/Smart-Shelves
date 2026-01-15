import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Filter, RefreshCw, Search } from 'lucide-react';
import { DocumentRecord, DocumentStatus } from '../types/documents';
import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();
const ITEMS_PER_PAGE = 10;
const DEFAULT_STATUSES: DocumentStatus[] = ['available', 'taken', 'returned', 'removed'];

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

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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

  const shelfOptions = useMemo(() => {
    if (!query.cabinet_id) return [];
    const cabinet = filterOptions.cabinets.find(cab => String(cab.id) === query.cabinet_id);
    return cabinet?.shelves ?? [];
  }, [filterOptions.cabinets, query.cabinet_id]);

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

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  };

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
    </div>
  );
};

export default Documents;
