import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import PanelGrid from '../components/PanelGrid';
import { getApiUrl } from '../config/environment';

const API_URL = getApiUrl();

interface Panel {
  id: number;
  name: string;
  ip_address?: string;
  rows: number;
  columns: number;
  room_id: number;
}

const PanelConfig = () => {
  const { roomId, panelId } = useParams<{ roomId: string; panelId: string }>();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (roomId && panelId) {
      fetchPanel();
    }
  }, [roomId, panelId]);

  const fetchPanel = async () => {
    try {
      const response = await axios.get(`${API_URL}/rooms/${roomId}/panels/${panelId}`);
      setPanel(response.data);
    } catch (error) {
      console.error('Failed to fetch panel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-800"></div>
      </div>
    );
  }

  if (!panel) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Panel not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(`/rooms/${roomId}`)}
          className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Panel Configuration
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure shelves and control row opening/closing
          </p>
        </div>
      </motion.div>

      <PanelGrid
        panel={panel}
        roomId={parseInt(roomId!)}
        onShelfUpdate={fetchPanel}
      />
    </div>
  );
};

export default PanelConfig;






