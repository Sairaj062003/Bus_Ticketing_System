import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import RoleSelect from './pages/RoleSelect';
import Dashboard from './pages/admin/Dashboard';
import BusManagement from './pages/admin/BusManagement';
import Search from './pages/customer/Search';
import BookingForm from './pages/customer/BookingForm';
import BookingHistory from './pages/customer/BookingHistory';

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={
          user ? (
            <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/customer/search'} replace />
          ) : (
            <RoleSelect />
          )
        } />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requiredRole="admin"><Dashboard /></ProtectedRoute>
        } />
        <Route path="/admin/buses" element={
          <ProtectedRoute requiredRole="admin"><BusManagement /></ProtectedRoute>
        } />

        {/* Customer Routes */}
        <Route path="/customer/search" element={
          <ProtectedRoute requiredRole="customer"><Search /></ProtectedRoute>
        } />
        <Route path="/customer/book" element={
          <ProtectedRoute requiredRole="customer"><BookingForm /></ProtectedRoute>
        } />
        <Route path="/customer/bookings" element={
          <ProtectedRoute requiredRole="customer"><BookingHistory /></ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
