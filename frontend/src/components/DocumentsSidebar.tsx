import React, { useMemo, useState, useEffect } from 'react';
import { FilePlus2, UploadCloud, Download, X, CheckCircle2, Search, DoorOpen } from 'lucide-react';
import { DocumentRecord, DocumentStatus } from '../types/documents';
import templateUrl from '../resources/images/eShelfTemplate.csv?url';

interface DocumentsSidebarProps {
  cabinetName?: string | null;
  documents: DocumentRecord[];
  onAddDocuments: (areaKey: string, newDocs: DocumentRecord[]) => void;
  onUpdateStatus: (areaKey: string, docId: string, status: DocumentStatus) => void;
  onOpenShelf?: (doc: DocumentRecord) => Promise<void>;
}

const statusLabels: Record<DocumentStatus, string> = {
  available: 'Available',
  taken: 'Taken',
  returned: 'Returned',
  removed: 'Removed',
};

const statusStyles: Record<DocumentStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  taken: 'bg-amber-50 text-amber-800 border border-amber-200',
  returned: 'bg-blue-50 text-blue-800 border border-blue-200',
  removed: 'bg-rose-50 text-rose-800 border border-rose-200',
};

const statusActions: DocumentStatus[] = ['taken', 'returned', 'removed'];

const normalizeSide = (value: string): 'L' | 'R' | null => {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'L' || normalized === 'LEFT') return 'L';
  if (normalized === 'R' || normalized === 'RIGHT') return 'R';
  return null;
};

const coerceStatus = (value: string): DocumentStatus => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'taken' || normalized === 'returned' || normalized === 'removed') {
    return normalized;
  }
  return 'available';
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
  cabinetName,
  documents,
  onAddDocuments,
  onUpdateStatus,
  onOpenShelf,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [singleForm, setSingleForm] = useState({
    reference: '',
    name: '',
    shelf: '',
    docket: '',
    side: 'L' as 'L' | 'R',
    row: '',
    column: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [bulkReport, setBulkReport] = useState<string | null>(null);
  const [statusModalDoc, setStatusModalDoc] = useState<DocumentRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [openShelfError, setOpenShelfError] = useState<string | null>(null);
  const [openShelfSuccess, setOpenShelfSuccess] = useState<string | null>(null);
  const [isOpeningShelf, setIsOpeningShelf] = useState(false);
  const areaKey = cabinetName?.trim().toLowerCase() || '';

  useEffect(() => {
    setOpenShelfError(null);
    setOpenShelfSuccess(null);
    setIsOpeningShelf(false);
  }, [statusModalDoc]);

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => a.reference.localeCompare(b.reference));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return sortedDocuments;
    const term = searchTerm.trim().toLowerCase();
    return sortedDocuments.filter(doc => {
      const shelfValue = (doc.shelf ?? '').toLowerCase();
      return (
        doc.reference.toLowerCase().includes(term) ||
        doc.name.toLowerCase().includes(term) ||
        shelfValue.includes(term)
      );
    });
  }, [sortedDocuments, searchTerm]);

  const handleSingleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setBulkReport(null);

    if (!areaKey) {
      setFormError('Select a cabinet before adding documents.');
      return;
    }

    const docketNumber = Number(singleForm.docket);
    const rowNumber = Number(singleForm.row);
    const columnNumber = Number(singleForm.column);

    if (Number.isNaN(docketNumber) || Number.isNaN(rowNumber) || Number.isNaN(columnNumber)) {
      setFormError('Docket, row, and column must be numbers.');
      return;
    }

    if (!singleForm.reference.trim() || !singleForm.name.trim() || !singleForm.shelf.trim()) {
      setFormError('Reference, name, and shelf are required.');
      return;
    }

    const newDoc: DocumentRecord = {
      id: generateId(),
      reference: singleForm.reference.trim(),
      name: singleForm.name.trim(),
      area: areaKey,
      shelf: singleForm.shelf.trim(),
      docket: docketNumber,
      side: singleForm.side,
      row: rowNumber,
      column: columnNumber,
      status: 'available',
    };

    onAddDocuments(areaKey, [newDoc]);
    setSingleForm({ reference: '', name: '', shelf: '', docket: '', side: 'L', row: '', column: '' });
    setIsAddModalOpen(false);
  };

  const parseCsvFile = async (file: File) => {
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      setBulkReport('No data rows found in the uploaded file.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const getValue = (row: string[], field: string) => {
      const index = headers.indexOf(field);
      if (index === -1) return '';
      return row[index]?.trim() || '';
    };

    const parsedDocs: DocumentRecord[] = [];
    const rowErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowValues = lines[i].split(',').map(value => value.trim());
      if (rowValues.length === 0 || rowValues.every(value => value === '')) {
        continue;
      }

      const reference = getValue(rowValues, 'reference');
      const name = getValue(rowValues, 'name');
      const shelf = getValue(rowValues, 'shelf');
      const area = (getValue(rowValues, 'area') || areaKey).toLowerCase();
      const sideValue = normalizeSide(getValue(rowValues, 'side'));
      const docketValue = Number(getValue(rowValues, 'docket'));
      const rowValue = Number(getValue(rowValues, 'row'));
      const columnValue = Number(getValue(rowValues, 'column'));
      const statusValue = getValue(rowValues, 'status');

      if (!reference || !name || !shelf) {
        rowErrors.push(`Row ${i + 1}: Missing reference, name, or shelf.`);
        continue;
      }

      if (!sideValue) {
        rowErrors.push(`Row ${i + 1}: Side must be L/R or LEFT/RIGHT.`);
        continue;
      }

      if (!area) {
        rowErrors.push(`Row ${i + 1}: Area is required.`);
        continue;
      }

      if (areaKey && area !== areaKey) {
        rowErrors.push(`Row ${i + 1}: Area ${area} does not match selected cabinet.`);
        continue;
      }

      if (Number.isNaN(docketValue) || Number.isNaN(rowValue) || Number.isNaN(columnValue)) {
        rowErrors.push(`Row ${i + 1}: Docket, row, and column must be numeric.`);
        continue;
      }

      parsedDocs.push({
        id: generateId(),
        reference,
        name,
        area,
        shelf,
        docket: docketValue,
        side: sideValue,
        row: rowValue,
        column: columnValue,
        status: coerceStatus(statusValue),
      });
    }

    if (parsedDocs.length) {
      onAddDocuments(areaKey, parsedDocs);
    }

    const summary = `Imported ${parsedDocs.length} document(s).${rowErrors.length ? ` Skipped ${rowErrors.length} row(s).` : ''}`;
    setBulkReport([summary, ...rowErrors].join('\n'));
    if (parsedDocs.length) {
      setIsAddModalOpen(false);
    }
  };

  const handleCsvChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !areaKey) {
      setBulkReport('Select a cabinet and upload a CSV file.');
      return;
    }
    parseCsvFile(file);
    event.target.value = '';
  };

  const handleStatusUpdate = (status: DocumentStatus) => {
    if (!statusModalDoc || !areaKey) return;
    onUpdateStatus(areaKey, String(statusModalDoc.id), status);
    setStatusModalDoc(null);
  };

  const handleOpenShelfClick = async () => {
    if (!statusModalDoc || !onOpenShelf) return;
    setOpenShelfError(null);
    setOpenShelfSuccess(null);
    setIsOpeningShelf(true);
    try {
      await onOpenShelf(statusModalDoc);
      setOpenShelfSuccess(`${statusModalDoc.reference} shelf opening triggered.`);
    } catch (err: any) {
      setOpenShelfError(err?.message || 'Failed to trigger shelf opening.');
    } finally {
      setIsOpeningShelf(false);
    }
  };

  const disableInteractions = !areaKey;

  return (
    <aside className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Documents</p>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{cabinetName || 'Select a cabinet'}</h3>
        </div>
        <button
          type="button"
          disabled={disableInteractions}
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-[#012169] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FilePlus2 className="w-4 h-4" />
          Add
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Click a document to update its status (Taken / Return / Removed).
      </p>

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by reference, name, or shelf..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm"
          disabled={disableInteractions}
        />
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {filteredDocuments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {disableInteractions ? 'Choose a cabinet to view its documents.' : 'No documents recorded yet.'}
          </p>
        ) : (
          filteredDocuments.map(doc => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setStatusModalDoc(doc)}
              className="w-full text-left rounded-xl border border-gray-200 dark:border-gray-800 p-3 hover:border-[#012169] hover:bg-[#012169]/5 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{doc.reference}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{doc.name}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyles[doc.status]}`}>
                  {statusLabels[doc.status]}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-400">
                <p><span className="font-semibold">Shelf:</span> {doc.shelf}</p>
                <p><span className="font-semibold">Docket:</span> {doc.docket}</p>
                <p><span className="font-semibold">Side:</span> {doc.side}</p>
                <p><span className="font-semibold">Row/Col:</span> {doc.row}/{doc.column}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Need a template?{' '}
        <a href={templateUrl} download className="text-[#012169] font-semibold">
          Download CSV
        </a>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <FilePlus2 className="w-5 h-5 text-[#012169]" />
              <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Documents</h4>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setAddMode('single')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                  addMode === 'single'
                    ? 'bg-[#012169] text-white border-[#012169]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setAddMode('bulk')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                  addMode === 'bulk'
                    ? 'bg-[#012169] text-white border-[#012169]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                Upload CSV
              </button>
            </div>

            {formError && <p className="text-sm text-red-600 mb-3">{formError}</p>}
            {bulkReport && <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-3 whitespace-pre-wrap">{bulkReport}</pre>}

            {addMode === 'single' ? (
              <form onSubmit={handleSingleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Reference</label>
                  <input
                    type="text"
                    value={singleForm.reference}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Name</label>
                  <input
                    type="text"
                    value={singleForm.name}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Shelf</label>
                    <input
                      type="text"
                      value={singleForm.shelf}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, shelf: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Docket</label>
                    <input
                      type="number"
                      value={singleForm.docket}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, docket: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Side</label>
                    <select
                      value={singleForm.side}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, side: e.target.value as 'L' | 'R' }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                    >
                      <option value="L">Left</option>
                      <option value="R">Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Row</label>
                    <input
                      type="number"
                      value={singleForm.row}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, row: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Column</label>
                    <input
                      type="number"
                      value={singleForm.column}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, column: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2 rounded-lg bg-[#012169] text-white font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Document
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload the template with columns: Reference, Name, Area, Shelf, Docket, Side, Row, Column, Status.
                </p>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer hover:border-[#012169]">
                  <UploadCloud className="w-6 h-6 text-[#012169]" />
                  <span className="text-sm font-semibold text-[#012169]">Choose CSV File</span>
                  <input type="file" accept=".csv" className="hidden" onChange={handleCsvChange} />
                </label>
                <a
                  href={templateUrl}
                  download
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#012169]"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {statusModalDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 relative">
            <button
              type="button"
              onClick={() => setStatusModalDoc(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Update Status
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {statusModalDoc.reference} — {statusModalDoc.name}
            </p>
            {onOpenShelf && (
              <div className="mb-4 space-y-2">
                <button
                  type="button"
                  onClick={handleOpenShelfClick}
                  disabled={isOpeningShelf}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
                >
                  <DoorOpen className="w-4 h-4" />
                  {isOpeningShelf ? 'Triggering...' : 'Open Shelf'}
                </button>
                {openShelfSuccess && <p className="text-xs text-emerald-600">{openShelfSuccess}</p>}
                {openShelfError && <p className="text-xs text-red-600">{openShelfError}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {statusActions.map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusUpdate(status)}
                  className={`px-4 py-2 rounded-xl font-semibold border ${
                    status === statusModalDoc.status
                      ? 'bg-[#012169] text-white border-[#012169]'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default DocumentsSidebar;
