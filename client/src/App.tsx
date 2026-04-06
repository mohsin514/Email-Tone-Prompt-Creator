import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserDashboard } from './pages/UserDashboard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <UserDashboard />
            </PrivateRoute>
          }
        />

        {/* Admin route */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Defaults */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
