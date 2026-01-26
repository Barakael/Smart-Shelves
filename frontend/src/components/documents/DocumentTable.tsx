import React, { useEffect, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { DocumentRecord } from '../../types/documents';
import { DocumentPageMeta } from '../../types/documentsPage';
import { statusStyles } from './statusConfig';

interface DocumentTableProps {
  documents: DocumentRecord[];
  pageMeta: DocumentPageMeta;
  currentPage: number;
  onPageChange: (direction: 'prev' | 'next') => void;
  onOpenDocument: (doc: DocumentRecord) => void;
  onEditDocument: (doc: DocumentRecord) => void;
  onArchiveDocument: (doc: DocumentRecord) => void;
  formatDate: (value?: string) => string;
}

const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  pageMeta,
  currentPage,
  onPageChange,
  onOpenDocument,
  onEditDocument,
  onArchiveDocument,
  formatDate,
}) => {
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleMenuToggle = (event: React.MouseEvent, docId: string | number) => {
    event.stopPropagation();
    setOpenMenuId(prev => (prev === docId ? null : docId));
  };

  const handleEdit = (event: React.MouseEvent, doc: DocumentRecord) => {
    event.stopPropagation();
    setOpenMenuId(null);
    onEditDocument(doc);
  };

  const handleArchive = (event: React.MouseEvent, doc: DocumentRecord) => {
    event.stopPropagation();
    setOpenMenuId(null);
    onArchiveDocument(doc);
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, doc: DocumentRecord) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenDocument(doc);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-lg dark:border-gray-800 dark:bg-gray-900/80">
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
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {documents.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-sm text-gray-500" colSpan={8}>
                  No documents match the selected filters.
                </td>
              </tr>
            ) : (
              documents.map(doc => (
                <tr
                  key={doc.id}
                  className="cursor-pointer hover:bg-gray-50/70 focus-within:bg-gray-50/90 dark:hover:bg-gray-800/40"
                  onClick={() => onOpenDocument(doc)}
                  onKeyDown={(event) => handleRowKeyDown(event, doc)}
                  role="button"
                  tabIndex={0}
                >
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
                  <td className="relative px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    <button
                      type="button"
                      onClick={(event) => handleMenuToggle(event, doc.id)}
                      className="rounded-full border border-gray-200 p-1 text-gray-500 hover:text-gray-800 dark:border-gray-700 dark:text-gray-300"
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === doc.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenuId === doc.id && (
                      <div className="absolute right-4 z-10 mt-2 w-36 rounded-xl border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-800">
                        <button
                          type="button"
                          onClick={(event) => handleEdit(event, doc)}
                          className="flex w-full items-center px-3 py-2 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleArchive(event, doc)}
                          className="flex w-full items-center px-3 py-2 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </td>
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
            onClick={() => onPageChange('prev')}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Page {currentPage} of {pageMeta.lastPage}
          </span>
          <button
            onClick={() => onPageChange('next')}
            disabled={currentPage >= pageMeta.lastPage || documents.length === 0}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentTable;
