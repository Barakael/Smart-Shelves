// Environment configuration for desktop vs web mode

// Check if running in Tauri (desktop app)
export const isDesktop = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Get the appropriate API URL based on environment
export const getApiUrl = (): string => {
  if (isDesktop()) {
    // Desktop app uses embedded PHP server on port 8765
    return 'http://localhost:8765/api';
  }
  
  // Web mode uses environment variable or default
  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
};

export const getBulkServiceUrl = (): string | undefined => {
  const configured = import.meta.env.VITE_BULK_API_URL as string | undefined;

  if (isDesktop()) {
    return configured || 'http://localhost:8100/api';
  }

  return configured;
};

// Export as default for easy importing
export default {
  isDesktop,
  apiUrl: getApiUrl(),
  bulkServiceUrl: getBulkServiceUrl(),
};
