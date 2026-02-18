import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import axios from 'axios';
import { getApiUrl } from '../config/environment';
import { FiltersResponse } from '../types/documentsPage';

const API_URL = getApiUrl();
const ITEMS_PER_PAGE = 10;

interface ActionLog {
  id: number;
  action_type: string;
  description: string;
  payload: any;
  created_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  room?: {
    id: number;
    name: string;
  };
  panel?: {
    id: number;
    name: string;
  };
  shelf?: {
    id: number;
    name: string;
  };
  cabinet?: {
    id: number;
    name: string;
  };
}

interface PaginatedMeta {
  total: number;
  lastPage: number;
  from: number;
  to: number;
}

type HistoryFilters = {
  from_date: string;
  to_date: string;
  cabinet_id: string;
  shelf_id: string;
};

const History = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<HistoryFilters>({
    from_date: '',
    to_date: '',
    cabinet_id: '',
    shelf_id: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOptions, setFilterOptions] = useState<FiltersResponse>({
    rooms: [],
    cabinets: [],
    statuses: [],
  });
  const [pageMeta, setPageMeta] = useState<PaginatedMeta>({
    total: 0,
    lastPage: 1,
    from: 0,
    to: 0,
  });

  const handleFilterChange = useCallback((updates: Partial<HistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    setCurrentPage(1);
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const { data } = await axios.get<FiltersResponse>(`${API_URL}/documents/filters`);
      setFilterOptions({
        rooms: data.rooms ?? [],
        cabinets: data.cabinets ?? [],
        statuses: data.statuses ?? [],
      });
    } catch (error) {
      console.error('Failed to load filter metadata:', error);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        per_page: String(ITEMS_PER_PAGE),
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params[key] = value;
        }
      });

      const { data } = await axios.get(`${API_URL}/action-logs`, { params });
      const resultData = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      const resolvedLastPage = data?.last_page ?? 1;
      if (resolvedLastPage >= 1 && currentPage > resolvedLastPage) {
        setCurrentPage(resolvedLastPage);
        return;
      }

      const from = data?.from ?? (resultData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0);
      const to = data?.to ?? (resultData.length ? (currentPage - 1) * ITEMS_PER_PAGE + resultData.length : 0);

      setLogs(resultData);
      setPageMeta({
        total: data?.total ?? resultData.length,
        lastPage: resolvedLastPage,
        from,
        to,
      });
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const cabinetOptions = filterOptions.cabinets;
  const shelfOptions = useMemo(() => {
    if (!filters.cabinet_id) return [];
    const cabinet = cabinetOptions.find(option => String(option.id) === filters.cabinet_id);
    return cabinet?.shelves ?? [];
  }, [cabinetOptions, filters.cabinet_id]);

  const getActionColor = (actionType: string) => {
    const normalized = actionType.toLowerCase();
    if (normalized.includes('open')) {
      return 'bg-green-50 text-green-800 border border-green-200';
    }
    if (normalized.includes('close')) {
      return 'bg-red-50 text-red-800 border border-red-200';
    }
    if (normalized.includes('config')) {
      return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
    }
    return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getCabinetDisplayName = (log: ActionLog) => {
    const rawName = log.panel?.name?.trim() || log.cabinet?.name?.trim();
    if (rawName) {
      if (/^area[-\s]?/i.test(rawName)) {
        return rawName.toLowerCase();
      }
      return rawName;
    }
    if (log.panel?.id) {
      return `area-${log.panel.id}`;
    }
    if ((log as any).cabinet?.name) {
      return (log as any).cabinet.name;
    }
    return '';
  };

  const handlePageChange = (direction: 'prev' | 'next') => {
    setCurrentPage(prev => {
      if (direction === 'prev') {
        return Math.max(1, prev - 1);
      }
      return Math.min(pageMeta.lastPage, prev + 1);
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Action History
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all actions and system logs
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowFilters(!showFilters)}
          className="px-6 py-3 bg-[#012169] text-white rounded-lg font-medium shadow-lg hover:bg-[#011a54] transition-all flex items-center space-x-2"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </motion.button>
      </motion.div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-300/50 dark:border-primary-800/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cabinet (Area)
              </label>
              <select
                value={filters.cabinet_id}
                onChange={(e) => handleFilterChange({ cabinet_id: e.target.value, shelf_id: '' })}
                className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
              >
                <option value="">All Cabinets</option>
                {cabinetOptions.map(cabinet => (
                  <option key={cabinet.id} value={String(cabinet.id)}>
                    {cabinet.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shelf
              </label>
              <select
                value={filters.shelf_id}
                onChange={(e) => handleFilterChange({ shelf_id: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
                disabled={!filters.cabinet_id || shelfOptions.length === 0}
              >
                <option value="">All Shelves</option>
                {shelfOptions.map(option => (
                  <option key={option.id} value={String(option.id)}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => handleFilterChange({ from_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => handleFilterChange({ to_date: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-primary-300 dark:border-primary-800 bg-white dark:bg-primary-900/50 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-800"
              />
            </div>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-800"></div>
        </div>
      ) : (
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl shadow-lg border border-primary-300/50 dark:border-primary-800/50"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Date &amp; Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Cabinet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Shelf
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      User
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td
                        className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                        colSpan={5}
                      >
                        No action logs match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition">
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action_type)}`}>
                            {log.action_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {getCabinetDisplayName(log) || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {log.shelf?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {log.user?.name || 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {logs.length ? `${pageMeta.from || 0}-${pageMeta.to || logs.length}` : 0} of {pageMeta.total} records
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange('prev')}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/40"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Page {currentPage} of {pageMeta.lastPage}
                </span>
                <button
                  onClick={() => handlePageChange('next')}
                  disabled={currentPage === pageMeta.lastPage || logs.length === 0}
                  className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed border-primary-300 dark:border-primary-700 text-primary-800 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-900/40"
                >
                  Next
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default History;

