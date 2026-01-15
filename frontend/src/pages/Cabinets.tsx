import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Lock, Wind, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Cabinet, Shelf, Room } from '../types/cabinet';
import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();
const MACRO_STORAGE_KEY = 'cabinet_macro_commands';
const GAP_DISTANCE = 60;

type MacroType = 'close' | 'lock' | 'vent';

type MacroStore = Record<number, Partial<Record<MacroType, string>>>;

const MACRO_LABELS: Record<MacroType, { label: string; placeholder: string }> = {
  close: { label: 'Close', placeholder: '68 04 09 00 00 00' },
  lock: { label: 'Lock Rail', placeholder: '68 04 10 00 00 00' },
  vent: { label: 'Ventilate', placeholder: '68 04 11 00 00 00' },
};

const MACRO_STYLES: Record<MacroType, string> = {
  close: 'bg-white text-black hover:text-white border border-blue-950 hover:bg-blue-950',
  lock: 'bg-white text-black hover:text-white border border-blue-950 hover:bg-blue-950',
  vent: 'bg-white text-black hover:text-white border border-blue-950 hover:bg-blue-950',
};

const Cabinets: React.FC = () => {
  const navigate = useNavigate();
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [operatingShelf, setOperatingShelf] = useState<number | null>(null);
  const [pendingOpenShelfId, setPendingOpenShelfId] = useState<number | null>(null);
  const [macroSending, setMacroSending] = useState<MacroType | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState<number | null>(null);
  const [macroCommands, setMacroCommands] = useState<MacroStore>({});

  useEffect(() => {
    fetchCabinets();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = window.localStorage.getItem(MACRO_STORAGE_KEY);
      if (cached) {
        setMacroCommands(JSON.parse(cached));
      }
    } catch (storageError) {
      console.warn('Unable to load macro commands from storage', storageError);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(macroCommands));
    } catch (storageError) {
      console.warn('Unable to persist macro commands', storageError);
    }
  }, [macroCommands]);

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!cabinets.length) return;
    const roomCabinets = cabinets.filter(cab => (selectedRoomId ? cab.room_id === selectedRoomId : true));
    if (!selectedCabinetId && roomCabinets.length > 0) {
      setSelectedCabinetId(roomCabinets[0].id);
      return;
    }
    if (selectedCabinetId && !roomCabinets.some(cab => cab.id === selectedCabinetId) && roomCabinets.length > 0) {
      setSelectedCabinetId(roomCabinets[0].id);
    }
  }, [cabinets, selectedRoomId, selectedCabinetId]);

  const fetchCabinets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/cabinets`);
      setCabinets(response.data);
    } catch (err) {
      setError('Failed to fetch cabinets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const handleOpenShelf = async (shelf: Shelf) => {
    if (pendingOpenShelfId || operatingShelf === shelf.id) {
      return;
    }

    setError(null);
    setSuccess(null);

    const parentCabinet = cabinets.find(cab => cab.id === shelf.cabinet_id);
    if (!parentCabinet) {
      setError('Cabinet not found for shelf');
      return;
    }

    if (shelf.is_open) {
      setSuccess(`${shelf.name} is already open.`);
      return;
    }

    setOperatingShelf(shelf.id);
    setPendingOpenShelfId(shelf.id);

    const currentlyOpenShelf = parentCabinet.shelves?.find(item => item.is_open);

    try {
      if (currentlyOpenShelf && currentlyOpenShelf.id !== shelf.id) {
        await axios.post(`${API_URL}/cabinets/${parentCabinet.id}/shelves/${currentlyOpenShelf.id}/close`);
      }

      await axios.post(`${API_URL}/cabinets/${parentCabinet.id}/shelves/${shelf.id}/open`);

      await new Promise(resolve => setTimeout(resolve, 2500));

      setSuccess(`Shelf ${shelf.name} opened successfully`);
      await fetchCabinets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to open shelf');
    } finally {
      setOperatingShelf(null);
      setPendingOpenShelfId(null);
    }
  };

  const sanitizeHexCommand = (value: string) =>
    value
      .replace(/[^0-9a-fA-F\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  const persistMacroCommand = (cabinetId: number, type: MacroType, command: string) => {
    setMacroCommands(prev => ({
      ...prev,
      [cabinetId]: {
        ...(prev[cabinetId] || {}),
        [type]: command,
      },
    }));
  };

  const resolveMacroCommand = (cabinetId: number, type: MacroType) => {
    const configured = getConfiguredMacro(cabinetId, type);
    if (configured) {
      return configured;
    }

    const cached = macroCommands[cabinetId]?.[type];
    if (cached) {
      return cached;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const userInput = window.prompt(`Enter hex command for ${MACRO_LABELS[type].label}`, MACRO_LABELS[type].placeholder);
    if (!userInput) {
      return null;
    }

    const sanitized = sanitizeHexCommand(userInput);
    if (!sanitized) {
      setError('Hex command cannot be empty.');
      return null;
    }

    persistMacroCommand(cabinetId, type, sanitized);
    return sanitized;
  };

  const handleMacroButtonClick = async (type: MacroType) => {
    if (!selectedCabinet) {
      setError('Select a cabinet to send commands.');
      return;
    }

    const macro = resolveMacroCommand(selectedCabinet.id, type);
    if (!macro) {
      return;
    }

    setMacroSending(type);
    setError(null);
    setSuccess(null);
    try {
      await axios.post(`${API_URL}/cabinets/${selectedCabinet.id}/commands/test`, {
        hex_command: macro,
      });
      setSuccess(`${MACRO_LABELS[type].label} command sent`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send command');
    } finally {
      setMacroSending(null);
    }
  };

  const getRoomName = (roomId: number) => rooms.find(r => r.id === roomId)?.name || 'Unknown Room';

  const filteredCabinets = useMemo(() => {
    if (!selectedRoomId) {
      return cabinets;
    }
    return cabinets.filter(cab => cab.room_id === selectedRoomId);
  }, [cabinets, selectedRoomId]);

  const selectedCabinet = useMemo(() => {
    if (!selectedCabinetId) return null;
    return cabinets.find(cab => cab.id === selectedCabinetId) || null;
  }, [cabinets, selectedCabinetId]);

  const openShelf = useMemo(() => {
    return selectedCabinet?.shelves?.find(shelf => shelf.is_open) || null;
  }, [selectedCabinet]);

  const shelvesByRow = useMemo(() => {
    if (!selectedCabinet?.shelves) return [];
    const grouped = new Map<number, Shelf[]>();
    selectedCabinet.shelves.forEach(shelf => {
      const row = shelf.row_index ?? 0;
      grouped.set(row, [...(grouped.get(row) || []), shelf]);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([row, shelves]) => ({
        row,
        shelves: [...shelves].sort((a, b) => a.column_index - b.column_index),
      }));
  }, [selectedCabinet]);

  const activeGapShelfId = pendingOpenShelfId ?? openShelf?.id ?? null;
  const activeGapShelf = selectedCabinet?.shelves?.find(shelf => shelf.id === activeGapShelfId) || null;
  const gapColumnIndex = activeGapShelf?.column_index ?? null;
  const gapRowIndex = activeGapShelf?.row_index ?? null;

  // Move shelves away from the active gap to create the sliding animation.
  // Only shelves behind (lower column index) the opened drawer shift backward.
  const computeShelfShift = (shelf: Shelf) => {
    if (gapColumnIndex === null || gapRowIndex === null) {
      return 0;
    }
    if ((shelf.row_index ?? 0) !== gapRowIndex) {
      return 0;
    }
    if (shelf.id === activeGapShelfId) {
      return 0;
    }
    // Only push shelves that are behind (lower column index) the opened shelf
    if (shelf.column_index < gapColumnIndex) {
      return -GAP_DISTANCE;
    }
    return 0;
  };

  const getConfiguredMacro = (cabinetId: number, type: MacroType) => {
    const cabinet = cabinets.find(cab => cab.id === cabinetId);
    if (!cabinet) {
      return null;
    }
    if (type === 'close') {
      return cabinet.macro_close_command || null;
    }
    if (type === 'lock') {
      return cabinet.macro_lock_command || null;
    }
    if (type === 'vent') {
      return cabinet.macro_vent_command || null;
    }
    return null;
  };

  return (
    <div className="p-1">
      <div className="max-w-8xl mx-auto space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Cabinets</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Operate shelves and dispatch cabinet commands</p>
          </div>
       
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-100 dark:bg-green-900/20 border border-green-400 text-green-700 dark:text-green-300 rounded-lg"
          >
            {success}
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#012169]"></div>
          </div>
        ) : cabinets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No cabinets configured yet</p>
          </div>
        ) : (
          <>
            {rooms.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Rooms</h3>
                <div className="flex flex-wrap gap-3">
                  {rooms.map(room => (
                    <motion.button
                      key={room.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                        selectedRoomId === room.id
                          ? 'bg-[#012169] text-white border-[#012169]'
                          : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {room.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cabinets</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Select a cabinet to load its rail layout</p>
              </div>
              {filteredCabinets.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 italic">No cabinets configured in this room</p>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {filteredCabinets.map(cabinet => {
                    const isCabinetConnected = cabinet.is_connected ?? false;
                    return (
                      <motion.div
                        key={cabinet.id}
                        whileHover={{ y: -4 }}
                        onClick={() => setSelectedCabinetId(cabinet.id)}
                        className={`min-w-[220px] cursor-pointer rounded-2xl border p-4 shadow-sm transition-all ${
                          selectedCabinetId === cabinet.id
                            ? 'bg-gradient-to-br from-[#012169] to-[#011a54] text-white border-transparent'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Cabinet</p>
                            <h4 className="text-xl font-semibold">{cabinet.name}</h4>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-mono">{cabinet.ip_address}</p>
                            <p className="opacity-80">Port {cabinet.port}</p>
                          </div>
                        </div>
                       
                        <p className="mt-2 text-xs opacity-75">{getRoomName(cabinet.room_id)}</p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCabinet ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Shelf Rail</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Send quick commands to all shelves in this cabinet.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <div className="flex items-center gap-2">
                        {(['close', 'lock', 'vent'] as MacroType[]).map(type => (
                          <button
                            key={type}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${MACRO_STYLES[type]}`}
                            onClick={() => handleMacroButtonClick(type)}
                            disabled={!selectedCabinet || macroSending === type}
                          >
                            <span className="flex items-center gap-1">
                              {type === 'close' && <XCircle className="w-3.5 h-3.5" />}
                              {type === 'lock' && <Lock className="w-3.5 h-3.5" />}
                              {type === 'vent' && <Wind className="w-3.5 h-3.5" />}
                              {macroSending === type ? 'Sending…' : MACRO_LABELS[type].label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {!selectedCabinet.shelves || selectedCabinet.shelves.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-500 dark:text-gray-400">
                    Add shelves to begin controlling this cabinet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shelvesByRow.map(({ row, shelves }) => (
                      <div key={row} className="rounded-2xl bg-gray-100 dark:bg-gray-800/60 p-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                          <span>{shelves.length} Shelves</span>
                        </div>
                        <div className="relative flex gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-gray-200 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-2">
                          {shelves.map(shelf => {
                            const shift = computeShelfShift(shelf);
                            const isActive = shelf.id === activeGapShelfId;
                            const isPending = pendingOpenShelfId === shelf.id;
                            const isOperating = operatingShelf === shelf.id;
                            return (
                              <motion.div
                                key={shelf.id}
                                animate={{ x: shift }}
                                transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                                className={`relative left-16 right-10  w-[80px] min-h-[200px] rounded-xl border bg-gradient-to-br from-gray-50 via-gray-200 to-gray-300 text-gray-900 shadow-inner ${
                                  isActive ? 'ring-4 ring-amber-300 border-amber-400' : 'border-gray-400'
                                }`}
                              >
                                {isActive && (
                                  <div className="absolute inset-0 bg-amber-200/30 pointer-events-none" />
                                )}
                                <div className="relative flex h-full flex-col items-center justify-between gap-3 p-3 text-center">
                                  <div>
                                    <p className="text-sm font-semibold truncate w-full">{shelf.name}</p>
                                    {shelf.is_controller && (
                                      <p className="text-[10px] uppercase tracking-wide text-[#012169] font-bold">Controller</p>
                                    )}
                                  </div>
                                  
                                  <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => handleOpenShelf(shelf)}
                                    disabled={isOperating || isPending}
                                    className={`w-full py-2 rounded-lg text-sm font-semibold shadow transition ${
                                      shelf.is_open || isPending
                                        ? 'bg-green-600 text-white'
                                        : 'bg-[#012169] text-white'
                                    } disabled:opacity-50`}
                                  >
                                    {isPending ? 'Opening…' : shelf.is_open ? 'Opened' : 'Open'}
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Select a cabinet to view its shelf controls.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Cabinets;
