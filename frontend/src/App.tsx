import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ShelvesConfig from './pages/ShelvesConfig';
import Rooms from './pages/Rooms';
import PanelConfig from './pages/PanelConfig';
import History from './pages/History';
import Settings from './pages/Settings';
import Users from './pages/Users';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
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
              <Route path="history" element={<History />} />
              <Route path="settings" element={<Settings />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

