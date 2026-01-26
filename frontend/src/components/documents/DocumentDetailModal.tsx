import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiUrl } from '../../config/environment';
import { X, ArrowUpRight } from 'lucide-react';
import { DocumentRecord, DocumentStatus, DocumentStatusHistoryEntry } from '../../types/documents';
import { statusLabels, statusStyles } from './statusConfig';

const API_URL = getApiUrl();

interface DocumentDetailModalProps {
  document: DocumentRecord;
  onClose: () => void;
  modalError: string | null;
  modalSuccess: string | null;
  documentStatusSummary: string;
  canOpenShelf: boolean;
  isShelfOpening: boolean;
  onShelfOpen: () => void;
  onDownloadPdf: () => void;
  onStatusChange: (status: DocumentStatus) => void;
  isStatusUpdating: boolean;
  statusHistory: DocumentStatusHistoryEntry[];
  isHistoryLoading: boolean;
  formatStatusTimestamp: (value?: string) => string;
  historyLimit?: number;
  isDocumentUnavailable: boolean;
}

const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
  modalError,
  modalSuccess,
  documentStatusSummary,
  canOpenShelf,
  isShelfOpening,
  onShelfOpen,
  onDownloadPdf,
  onStatusChange,
  isStatusUpdating,
  statusHistory,
  isHistoryLoading,
  formatStatusTimestamp,
  historyLimit = 3,
  isDocumentUnavailable,
}) => {
  const visibleStatusHistory = useMemo(
    () => statusHistory.slice(0, Math.max(1, historyLimit)),
    [statusHistory, historyLimit]
  );
  const hasHiddenHistory = statusHistory.length > visibleStatusHistory.length;
  const fileEndpoint = useMemo(() => `${API_URL}/documents/${document.id}/file`, [document.id]);
  const hasFile = Boolean(document.has_file);
  const fileLabel = document.file_original_name || 'PDF attachment';
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasFile) {
      setPreviewUrl(null);
      setPreviewError(null);
      return;
    }

    let isCancelled = false;
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      setIsPreviewLoading(true);
      setPreviewError(null);
      setPreviewUrl(null);

      try {
        const response = await axios.get(fileEndpoint, {
          responseType: 'blob',
        });

        if (isCancelled) {
          return;
        }

        const blob = new Blob([response.data], {
          type: response.headers['content-type'] || 'application/pdf',
        });
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      } catch (error) {
        console.error('Failed to load PDF preview', error);
        if (!isCancelled) {
          setPreviewError('Unable to load embedded preview. Open it in a new tab instead.');
        }
      } finally {
        if (!isCancelled) {
          setIsPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileEndpoint, hasFile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-5xl max-h-[85vh] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Reference</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{document.reference}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{document.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={onShelfOpen}
            disabled={!canOpenShelf || isShelfOpening}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold shadow ${
              canOpenShelf ? 'bg-[#012169] text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            } ${isShelfOpening ? 'opacity-70' : ''}`}
          >
            {isShelfOpening ? 'Opening…' : 'Open Shelf'}
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={!hasFile}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Open PDF
          </button>
        </div>

        {modalError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
            {modalError}
          </div>
        )}

        {modalSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200">
            {modalSuccess}
          </div>
        )}

        <div className="mt-5 grid gap-4 lg:grid-cols-[600px_minmax(0,1fr)]">
          <div className="flex h-[460px] flex-col gap-3 overflow-hidden">
            <section
              className={`rounded-2xl border border-gray-100 px-3.5 py-3 text-xs ${
                isDocumentUnavailable
                  ? 'bg-amber-50/70 text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200'
                  : 'bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200'
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide">Physical copy</p>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">{documentStatusSummary}</p>
            </section>

            <section className="rounded-2xl border border-gray-100 px-3.5 py-3 text-xs dark:border-gray-800">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status controls</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {document.status !== 'removed' ? (
                  <button
                    type="button"
                    onClick={() => onStatusChange('removed')}
                    disabled={isStatusUpdating}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                  >
                    Mark as Removed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onStatusChange('available')}
                    disabled={isStatusUpdating}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Mark as Available
                  </button>
                )}
              </div>
            </section>

            <section className="flex flex-1 flex-col rounded-2xl border border-gray-100 px-3.5 py-3 text-xs dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status history</h3>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">Most recent first</span>
              </div>
              <div className="mt-2 flex-1 overflow-y-auto pr-1">
                {isHistoryLoading ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading history…</p>
                ) : statusHistory.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No status changes have been recorded yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {visibleStatusHistory.map(entry => (
                      <li key={entry.id} className="rounded-xl border border-gray-100 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[entry.status]}`}>
                            {statusLabels[entry.status]}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatStatusTimestamp(entry.created_at)}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                          By {entry.user?.name || 'System'}{entry.note ? ` • ${entry.note}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {hasHiddenHistory && (
                <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                  Showing latest {historyLimit} entries out of {statusHistory.length}.
                </p>
              )}
            </section>
          </div>

          <section className="flex h-[460px] flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 dark:border-gray-800">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">PDF preview</p>
                <p className="text-[11px] text-gray-600 dark:text-gray-300">{hasFile ? fileLabel : 'No PDF attached'}</p>
              </div>
              {hasFile && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#012169]"
                >
                  Open <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
            {hasFile ? (
              <div className="flex flex-1 flex-col bg-gray-50 dark:bg-gray-900/20">
                {isPreviewLoading ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                    Loading PDF…
                  </div>
                ) : previewUrl ? (
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className="flex-1 w-full"
                    aria-label="Document PDF preview"
                  >
                    <p className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      Your browser cannot render inline PDFs. Use the button below to open it in a new tab.
                    </p>
                  </object>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-600 dark:text-gray-400">
                    {previewError || 'Preview unavailable. Open it in a new tab instead.'}
                  </div>
                )}
                <div className="border-t border-gray-100 bg-white px-4 py-3 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-300">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p>{previewError ? 'Preview failed to load.' : 'Need a larger view?'}</p>
                    <button
                      type="button"
                      onClick={onDownloadPdf}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#012169] px-3 py-1 text-[11px] font-semibold text-white shadow"
                    >
                      Open PDF in New Tab
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-gray-50 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                No PDF attached to this document.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailModal;
