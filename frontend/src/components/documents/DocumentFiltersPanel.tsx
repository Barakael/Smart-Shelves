import React from 'react';
import { motion } from 'framer-motion';
import { DocumentQueryState, FiltersResponse } from '../../types/documentsPage';

interface DocumentFiltersPanelProps {
  visible: boolean;
  query: DocumentQueryState;
  filterOptions: FiltersResponse;
  shelfOptions: { id: number; name: string }[];
  onQueryChange: (updates: Partial<DocumentQueryState>) => void;
}

const DocumentFiltersPanel: React.FC<DocumentFiltersPanelProps> = ({
  visible,
  query,
  filterOptions,
  shelfOptions,
  onQueryChange,
}) => {
  if (!visible) {
    return null;
  }

  const handleCabinetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onQueryChange({ cabinet_id: event.target.value, shelf_id: '', page: 1 });
  };

  const handleShelfChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onQueryChange({ shelf_id: event.target.value, page: 1 });
  };

  return (
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
            onChange={handleCabinetChange}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All cabinets</option>
            {filterOptions.cabinets.map(cabinet => (
              <option key={cabinet.id} value={cabinet.id}>
                {cabinet.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">Shelf</label>
          <select
            value={query.shelf_id}
            onChange={handleShelfChange}
            disabled={!query.cabinet_id || shelfOptions.length === 0}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">All shelves</option>
            {shelfOptions.map(shelf => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">From</label>
          <input
            type="date"
            value={query.from_date}
            onChange={event => onQueryChange({ from_date: event.target.value, page: 1 })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">To</label>
          <input
            type="date"
            value={query.to_date}
            onChange={event => onQueryChange({ to_date: event.target.value, page: 1 })}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentFiltersPanel;
