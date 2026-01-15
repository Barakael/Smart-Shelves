import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ShelvesConfig from './pages/ShelvesConfig';
import Rooms from './pages/Rooms';
import PanelConfig from './pages/PanelConfig';
import History from './pages/History';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Cabinets from './pages/Cabinets';
import Documents from './pages/Documents';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './components/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const routerFuture = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  } as const;

  useEffect(() => {
    // Show splash screen on first load only
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <Router future={routerFuture}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="shelves" element={<ShelvesConfig />} />
                  <Route path="rooms" element={<Rooms />} />
                  <Route path="rooms/:roomId/panels/:panelId" element={<PanelConfig />} />
                  <Route path="cabinets" element={<Cabinets />} />
                  <Route path="documents" element={<Documents />} />
                  <Route path="history" element={<History />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="users" element={<Users />} />
                </Route>
              </Routes>
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </>
  );
}

export default App;

