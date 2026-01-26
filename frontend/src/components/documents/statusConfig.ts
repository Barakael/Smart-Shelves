import { DocumentStatus } from '../../types/documents';

export const DEFAULT_STATUSES: DocumentStatus[] = ['available', 'taken', 'returned', 'removed'];

export const statusLabels: Record<DocumentStatus, string> = {
  available: 'Available',
  taken: 'Taken',
  returned: 'Returned',
  removed: 'Removed',
};

export const statusStyles: Record<DocumentStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  taken: 'bg-amber-50 text-amber-800 border border-amber-200',
  returned: 'bg-blue-50 text-blue-800 border border-blue-200',
  removed: 'bg-rose-50 text-rose-800 border border-rose-200',
};
