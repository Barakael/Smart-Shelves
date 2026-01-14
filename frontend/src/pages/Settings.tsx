import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Save, KeyRound, Plus, Wifi, WifiOff, RefreshCw, X, Check, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Cabinet, Shelf, Room } from '../types/cabinet';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const getTabFromSearch = (search: string): 'personal' | 'configurations' =>
  new URLSearchParams(search).get('tab') === 'configurations' ? 'configurations' : 'personal';

const Settings = () => {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'personal' | 'configurations'>(() => getTabFromSearch(location.search));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(getTabFromSearch(location.search));
  }, [location.search]);

  const handleTabChange = (tab: 'personal' | 'configurations') => {
    if (tab === activeTab) {
      return;
    }
    setActiveTab(tab);
    const query = tab === 'configurations' ? '?tab=configurations' : '';
    navigate(`/settings${query}`, { replace: true });
  };

  const clearAlerts = () => {
    setMessage(null);
    setError(null);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    setIsSavingProfile(true);
    try {
      await axios.put(`${API_URL}/profile`, { name, phone });
      await refreshUser();
      setMessage('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setIsSavingPassword(true);
    try {
      await axios.put(`${API_URL}/profile`, {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setMessage('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.current_password?.[0] || 'Failed to update password';
      setError(msg);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your profile and password</p>
      </motion.div>

      <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700">
        {['personal', 'configurations'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab as 'personal' | 'configurations')}
            className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#012169] text-[#012169] dark:text-white'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab === 'personal' ? 'Personal' : 'Configurations'}
          </button>
        ))}
      </div>

      {activeTab === 'personal' ? (
        <>
          {message && (
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-300/50 dark:border-primary-800/50"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile</h2>
              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-900/70 text-gray-500 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 555 555 5555"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 bg-[#012169] text-white px-4 py-2 rounded-lg hover:bg-[#011449] transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>

            {/* Password Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-primary-300/50 dark:border-primary-800/50"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h2>
              <form onSubmit={savePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lgFocus:ring-2 focus:ring-[#012169] focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#012169] focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="inline-flex items-center gap-2 bg-[#012169] text-white px-4 py-2 rounded-lg hover:bg-[#011449] transition-colors disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    {isSavingPassword ? 'Saving...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      ) : (
        <ConfigurationsTab />
      )}
    </div>
  );
};

function ConfigurationsTab() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedCabinetId, setSelectedCabinetId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ip_address: '',
    port: 8080,
    function_byte: '',
    checksum_offset: '',
    total_rows: 1,
    total_columns: 1,
    shelf_count: 1,
    room_id: '',
    is_active: true,
  });
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<number, boolean>>({});
  const [manualCommand, setManualCommand] = useState('');
  const [manualCommandError, setManualCommandError] = useState<string | null>(null);
  const [manualCommandSuccess, setManualCommandSuccess] = useState<string | null>(null);
  const [sendingManualCommand, setSendingManualCommand] = useState(false);
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
  const [shelfFormData, setShelfFormData] = useState({
    name: '',
    column_index: 0,
    row_index: 0,
    is_controller: false,
    open_command: '',
    close_command: '',
  });

  const plannedShelfCount = Number(formData.shelf_count) || 0;
  const plannedRowCount = Number(formData.total_rows) || 0;
  const plannedColumnCount = Number(formData.total_columns) || 0;

  const sanitizeHexByte = (value: string) => value.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 2);

  const decimalToHexByte = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (Number.isNaN(numericValue)) {
      return '';
    }
    return Math.max(0, Math.min(255, numericValue)).toString(16).toUpperCase().padStart(2, '0');
  };

  const hexByteToDecimal = (value: string) => {
    const sanitized = value.replace(/[^0-9a-fA-F]/g, '');
    if (!sanitized) {
      return NaN;
    }
    return parseInt(sanitized, 16);
  };

  const clearAlerts = () => {
    setMessage(null);
    setError(null);
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms`);
      setRooms(response.data);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  };

  const fetchCabinets = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/cabinets`);
      setCabinets(response.data);
      setConnectionStatus(prev => {
        const hydrated = { ...prev };
        response.data.forEach((cabinet: Cabinet) => {
          if (typeof cabinet.is_connected === 'boolean') {
            hydrated[cabinet.id] = cabinet.is_connected;
          }
        });
        return hydrated;
      });
    } catch (err) {
      setError('Failed to fetch cabinets');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchCabinets();
  }, []);

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
    } else if (selectedCabinetId && !roomCabinets.some(cab => cab.id === selectedCabinetId)) {
      setSelectedCabinetId(roomCabinets[0]?.id ?? null);
    }
  }, [cabinets, selectedRoomId, selectedCabinetId]);

  useEffect(() => {
    setManualCommand('');
    setManualCommandError(null);
    setManualCommandSuccess(null);
  }, [selectedCabinetId]);

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

  const getRoomName = (roomId: number) => rooms.find(r => r.id === roomId)?.name || 'Unknown Room';

  const formatHexByte = (value: number) => value.toString(16).padStart(2, '0').toUpperCase();

  const buildOpenCommand = (cabinet: Cabinet | null, columnIndex: number) => {
    if (!cabinet) return 'N/A';
    const func = (cabinet.function_byte || '00').toUpperCase().padStart(2, '0');
    const panelByte = formatHexByte(columnIndex + 1);
    const checksum = formatHexByte(columnIndex + 1 + cabinet.checksum_offset);
    return `68 04 09 ${func} ${panelByte} ${checksum}`;
  };

  const buildCloseCommand = (cabinet: Cabinet | null, columnIndex: number) => {
    if (!cabinet) return 'N/A';
    const func = (cabinet.function_byte || '00').toUpperCase().padStart(2, '0');
    const panelByte = formatHexByte(columnIndex + 1);
    return `68 03 08 ${func} ${panelByte}`;
  };

  const resolveOpenCommand = (cabinet: Cabinet | null, shelf: Shelf) => {
    if (shelf.open_command && shelf.open_command.trim().length > 0) {
      return shelf.open_command;
    }
    return buildOpenCommand(cabinet, shelf.column_index);
  };

  const resolveCloseCommand = (cabinet: Cabinet | null, shelf: Shelf) => {
    if (shelf.close_command && shelf.close_command.trim().length > 0) {
      return shelf.close_command;
    }
    return buildCloseCommand(cabinet, shelf.column_index);
  };

  const testConnection = async (ip: string, port: number) => {
    try {
      const response = await axios.post(`${API_URL}/cabinets/test-connection`, {
        ip_address: ip,
        port,
      });
      return response.data.success;
    } catch (err) {
      return false;
    }
  };

  const handleTestConnection = async (cabinetId?: number) => {
    const ip = editingCabinet?.ip_address || formData.ip_address;
    const port = editingCabinet?.port || formData.port;

    if (!ip) {
      setError('Please enter an IP address');
      return;
    }

    setTestingConnection(cabinetId || -1);
    const success = await testConnection(ip, port);
    setConnectionStatus(prev => ({
      ...prev,
      [cabinetId || -1]: success,
    }));
    setTestingConnection(null);
  };

  const handleCardTestConnection = async (cabinet: Cabinet) => {
    setTestingConnection(cabinet.id);
    const success = await testConnection(cabinet.ip_address, cabinet.port);
    setConnectionStatus(prev => ({
      ...prev,
      [cabinet.id]: success,
    }));
    setTestingConnection(null);
  };

  const handleOpenModal = (cabinet?: Cabinet) => {
    clearAlerts();
    if (cabinet) {
      setEditingCabinet(cabinet);
      setFormData({
        name: cabinet.name,
        ip_address: cabinet.ip_address,
        port: cabinet.port,
        function_byte: sanitizeHexByte(cabinet.function_byte || ''),
        checksum_offset: decimalToHexByte(cabinet.checksum_offset ?? ''),
        total_rows: cabinet.total_rows || 1,
        total_columns: cabinet.total_columns || 1,
        shelf_count: cabinet.shelf_count ?? cabinet.shelves?.length ?? 1,
        room_id: cabinet.room_id.toString(),
        is_active: cabinet.is_active,
      });
    } else {
      setEditingCabinet(null);
      setFormData({
        name: '',
        ip_address: '',
        port: 8080,
        function_byte: '',
        checksum_offset: '',
        total_rows: 1,
        total_columns: 1,
        shelf_count: 1,
        room_id: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCabinet(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'function_byte') {
      setFormData(prev => ({
        ...prev,
        function_byte: sanitizeHexByte(value),
      }));
      return;
    }

    if (name === 'checksum_offset') {
      setFormData(prev => ({
        ...prev,
        checksum_offset: sanitizeHexByte(value),
      }));
      return;
    }

    const numericFields = ['port', 'total_rows', 'total_columns', 'shelf_count'];

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : numericFields.includes(name)
          ? (value === '' ? '' : Number.isNaN(parseInt(value, 10)) ? 0 : parseInt(value, 10))
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();

    if (!formData.name || !formData.ip_address || !formData.function_byte || !formData.room_id || !formData.checksum_offset) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.function_byte.length !== 2) {
      setError('Function byte must be two hex characters (e.g., 01, 03).');
      return;
    }

    const checksumDecimal = hexByteToDecimal(formData.checksum_offset);
    if (Number.isNaN(checksumDecimal)) {
      setError('Checksum offset must be a valid hex byte (00-FF).');
      return;
    }

    const shelfCountValue = plannedShelfCount;
    if (!shelfCountValue || shelfCountValue < 1 || Number.isNaN(shelfCountValue)) {
      setError('Number of shelves must be at least 1.');
      return;
    }

    const rowsValue = plannedRowCount;
    const columnsValue = plannedColumnCount;

    if (!rowsValue || rowsValue < 1 || Number.isNaN(rowsValue)) {
      setError('Total rows must be at least 1.');
      return;
    }

    if (!columnsValue || columnsValue < 1 || Number.isNaN(columnsValue)) {
      setError('Total columns must be at least 1.');
      return;
    }

    try {
      const payload = {
        ...formData,
        function_byte: formData.function_byte.toUpperCase(),
        checksum_offset: checksumDecimal,
        total_rows: rowsValue,
        total_columns: columnsValue,
        shelf_count: shelfCountValue,
      };

      if (editingCabinet) {
        await axios.put(`${API_URL}/cabinets/${editingCabinet.id}`, payload);
        setMessage('Cabinet updated successfully');
      } else {
        await axios.post(`${API_URL}/cabinets`, payload);
        setMessage('Cabinet created successfully');
      }
      await fetchCabinets();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save cabinet');
    }
  };

  const handleDelete = async (cabinetId: number) => {
    if (!window.confirm('Are you sure you want to delete this cabinet?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/cabinets/${cabinetId}`);
      setMessage('Cabinet deleted successfully');
      await fetchCabinets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete cabinet');
    }
  };

  const handleManualCommandSend = async () => {
    if (!selectedCabinet || !manualCommand.trim()) return;
    setManualCommandError(null);
    setManualCommandSuccess(null);
    setSendingManualCommand(true);
    try {
      const response = await axios.post(`${API_URL}/cabinets/${selectedCabinet.id}/commands/test`, {
        hex_command: manualCommand,
      });
      setManualCommandSuccess(response.data.message || 'Command sent successfully');
      if (response.data.hex_command) {
        setManualCommand(response.data.hex_command);
      }
    } catch (err: any) {
      const apiMessage = err.response?.data?.errors?.hex_command?.[0] || err.response?.data?.message;
      setManualCommandError(apiMessage || 'Failed to send command');
    } finally {
      setSendingManualCommand(false);
    }
  };

  const handleEditShelfModal = (shelf: Shelf) => {
    if (!selectedCabinet) return;
    setEditingShelf(shelf);
    setShelfFormData({
      name: shelf.name,
      column_index: shelf.column_index,
      row_index: shelf.row_index ?? 0,
      is_controller: !!shelf.is_controller,
      open_command: shelf.open_command || '',
      close_command: shelf.close_command || '',
    });
    setIsShelfModalOpen(true);
  };

  const handleShelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShelf || !selectedCabinet) return;
    clearAlerts();

    try {
      const payload = {
        name: shelfFormData.name,
        column_index: editingShelf.column_index,
        row_index: Number(shelfFormData.row_index),
        is_controller: shelfFormData.is_controller,
        cabinet_id: selectedCabinet.id,
        room_id: selectedCabinet.room_id,
        panel_id: editingShelf.panel_id ?? null,
        open_command: shelfFormData.open_command.trim() || null,
        close_command: shelfFormData.close_command.trim() || null,
      };

      await axios.put(`${API_URL}/shelves/${editingShelf.id}`, payload);
      setMessage('Shelf updated successfully');
      await fetchCabinets();
      setIsShelfModalOpen(false);
      setEditingShelf(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update shelf');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#012169]"></div>
      </div>
    );
  }

  const shelvesSorted = selectedCabinet?.shelves
    ? [...selectedCabinet.shelves].sort((a, b) => a.column_index - b.column_index)
    : [];

  const configuredShelfCount = selectedCabinet?.shelf_count ?? selectedCabinet?.shelves?.length ?? 0;
  const shelfLayoutRows = selectedCabinet?.total_rows ?? 0;
  const shelfLayoutColumns = selectedCabinet?.total_columns ?? 0;
  const checksumDecimalDisplay = typeof selectedCabinet?.checksum_offset === 'number'
    ? selectedCabinet.checksum_offset
    : Number.parseInt(String(selectedCabinet?.checksum_offset ?? '0'), 10) || 0;
  const formattedFunctionByte = selectedCabinet?.function_byte
    ? selectedCabinet.function_byte.toUpperCase().padStart(2, '0')
    : '--';
  const formattedChecksumOffset = decimalToHexByte(selectedCabinet?.checksum_offset ?? '');

  return (
    <div className="space-y-8">
      {message && (
        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-800">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Cabinet Configurations</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Edit hardware profiles, default shelves, and manual packets.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#012169] text-white rounded-lg shadow hover:bg-[#011a54]"
        >
          <Plus className="w-4 h-4" />
          Add Cabinet
        </motion.button>
      </div>

      {rooms.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Rooms</h3>
          <div className="flex flex-wrap gap-2">
            {rooms.map(room => (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  selectedRoomId === room.id
                    ? 'bg-[#012169] text-white border-[#012169]'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredCabinets.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-2xl">
          No cabinets configured in this room.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCabinets.map(cabinet => {
            const isCabinetConnected = connectionStatus[cabinet.id] ?? cabinet.is_connected ?? false;
            return (
              <motion.div
                key={cabinet.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedCabinetId(cabinet.id)}
                className={`rounded-xl border p-4 shadow-sm cursor-pointer ${
                  selectedCabinetId === cabinet.id
                    ? 'border-[#012169] bg-[#012169]/5'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Cabinet</p>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{cabinet.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{cabinet.ip_address}:{cabinet.port}</p>
                  </div>
                  <button
                    className="text-rose-500 hover:text-rose-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cabinet.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm mt-4">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    {isCabinetConnected ? (
                      <>
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span>Connected</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-rose-400" />
                        <span>Offline</span>
                      </>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardTestConnection(cabinet);
                    }}
                    disabled={testingConnection === cabinet.id}
                    className="px-3 py-1 text-xs font-semibold border rounded-full text-gray-700 dark:text-gray-200"
                  >
                    {testingConnection === cabinet.id ? 'Testing...' : 'Test Link'}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedCabinet ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{selectedCabinet.name}</h3>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleOpenModal(selectedCabinet)}
                  className="px-3 py-1.5 text-xs border rounded-full"
                >
                  Edit
                </motion.button>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Room:</strong> {getRoomName(selectedCabinet.room_id)}</p>
                <p><strong>IP:</strong> {selectedCabinet.ip_address}:{selectedCabinet.port}</p>
                <p><strong>Function Byte:</strong> {formattedFunctionByte}</p>
                <p><strong>Checksum Offset:</strong> 0x{formattedChecksumOffset || '00'} ({checksumDecimalDisplay})</p>
                <p><strong>Configured Shelves:</strong> {configuredShelfCount || '—'}</p>
                <p><strong>Shelf Layout:</strong> {(shelfLayoutRows || 1)} rows × {(shelfLayoutColumns || 1)} columns</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Manual Packet Sender</h3>
                <span className="text-xs uppercase tracking-wide text-gray-500">Test Mode</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Paste any hex string (e.g., <span className="font-mono">68 04 09 01 0B 15</span>) to verify cabinet delivery.
              </p>
              <textarea
                value={manualCommand}
                onChange={(e) => setManualCommand(e.target.value)}
                placeholder="68 04 09 01 0B 15"
                className="w-full h-28 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#012169]"
              />
              {manualCommandError && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">{manualCommandError}</p>
              )}
              {manualCommandSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-2">{manualCommandSuccess}</p>
              )}
              <motion.button
                whileHover={{ scale: manualCommand.trim() ? 1.02 : 1 }}
                whileTap={{ scale: manualCommand.trim() ? 0.98 : 1 }}
                onClick={handleManualCommandSend}
                disabled={!manualCommand.trim() || sendingManualCommand}
                className="mt-4 w-full py-2.5 rounded-lg font-semibold bg-[#012169] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingManualCommand ? 'Sending...' : 'Send Command'}
              </motion.button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Hex Command Preview</h3>
            {shelvesSorted.length ? (
              <div className="space-y-2 text-xs font-mono bg-gray-100/70 dark:bg-gray-800/70 rounded-xl p-4 text-gray-800 dark:text-gray-200 max-h-48 overflow-y-auto">
                {shelvesSorted.map((shelf) => (
                  <div key={shelf.id} className="flex flex-col border-b border-gray-200/60 dark:border-gray-700/60 pb-2 last:border-none last:pb-0">
                    <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Panel {shelf.column_index + 1}</span>
                    <span>Open: {resolveOpenCommand(selectedCabinet, shelf)}</span>
                    <span>Close: {resolveCloseCommand(selectedCabinet, shelf)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shelves configured yet.</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Shelf Commands</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Auto-generated from cabinet layout. Edit a shelf to override its packets.</p>
              </div>
            </div>
            {shelvesSorted.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-4 font-semibold">Shelf</th>
                      <th className="py-2 pr-4 font-semibold">Panel</th>
                      <th className="py-2 pr-4 font-semibold">Open Command</th>
                      <th className="py-2 pr-4 font-semibold">Close Command</th>
                      <th className="py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shelvesSorted.map((shelf) => (
                      <tr key={shelf.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{shelf.name}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{shelf.column_index + 1}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-700 dark:text-gray-200">{resolveOpenCommand(selectedCabinet, shelf)}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-700 dark:text-gray-200">{resolveCloseCommand(selectedCabinet, shelf)}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => handleEditShelfModal(shelf)}
                            className="inline-flex items-center gap-1 text-xs text-[#012169] hover:underline"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shelves present for this cabinet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 border-2 border-dashed rounded-2xl">
          Select a cabinet to view its configuration.
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingCabinet ? 'Edit Cabinet' : 'Add Cabinet'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cabinet Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IP Address *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleTestConnection()}
                    disabled={testingConnection === -1}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {testingConnection === -1 ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Test'}
                  </motion.button>
                </div>
                {connectionStatus[-1] !== undefined && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${connectionStatus[-1] ? 'text-green-600' : 'text-red-600'}`}>
                    {connectionStatus[-1] ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connection successful
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Connection failed
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Function Byte *
                  </label>
                  <input
                    type="text"
                    name="function_byte"
                    value={formData.function_byte}
                    onChange={handleInputChange}
                    required
                    maxLength={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Checksum Offset *
                  </label>
                  <input
                    type="text"
                    name="checksum_offset"
                    value={formData.checksum_offset}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Room *
                  </label>
                  <select
                    name="room_id"
                    value={formData.room_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Shelves (panels) *
                </label>
                <input
                  type="number"
                  name="shelf_count"
                  min="1"
                  value={formData.shelf_count}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  One shelf = one moving block/door. Example: Area-1 uses 11 shelves.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rows per Shelf
                  </label>
                  <input
                    type="number"
                    name="total_rows"
                    min="1"
                    value={formData.total_rows}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Columns per Shelf
                  </label>
                  <input
                    type="number"
                    name="total_columns"
                    min="1"
                    value={formData.total_columns}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Provision Preview
                </label>
                <div className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  {plannedShelfCount || '—'} shelves × {plannedRowCount || '—'} rows × {plannedColumnCount || '—'} columns per shelf
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  We create exactly this many shelf records and attach the default open/close commands automatically.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  id="config_is_active"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="config_is_active" className="text-sm text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-2 bg-[#012169] text-white rounded-lg font-medium hover:bg-[#011a54] transition-colors"
                >
                  {editingCabinet ? 'Update Cabinet' : 'Add Cabinet'}
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isShelfModalOpen && editingShelf && selectedCabinet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit {editingShelf.name}</h2>
              <button
                onClick={() => {
                  setIsShelfModalOpen(false);
                  setEditingShelf(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleShelfSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shelf Name *</label>
                <input
                  type="text"
                  value={shelfFormData.name}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Column Index</label>
                  <input
                    type="number"
                    value={shelfFormData.column_index}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Row Index</label>
                  <input
                    type="number"
                    min="0"
                    value={shelfFormData.row_index}
                    onChange={(e) => setShelfFormData({ ...shelfFormData, row_index: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={shelfFormData.is_controller}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, is_controller: e.target.checked })}
                  id="config_is_controller"
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="config_is_controller" className="text-sm text-gray-700 dark:text-gray-300">
                  Controller shelf
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Open Command</label>
                <textarea
                  value={shelfFormData.open_command}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, open_command: e.target.value })}
                  placeholder={buildOpenCommand(selectedCabinet, editingShelf.column_index)}
                  className="w-full h-20 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Close Command</label>
                <textarea
                  value={shelfFormData.close_command}
                  onChange={(e) => setShelfFormData({ ...shelfFormData, close_command: e.target.value })}
                  placeholder={buildCloseCommand(selectedCabinet, editingShelf.column_index)}
                  className="w-full h-20 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-4 py-2 bg-[#012169] text-white rounded-lg font-medium hover:bg-[#011a54] transition-colors"
                >
                  Save Changes
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsShelfModalOpen(false);
                    setEditingShelf(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Settings;
