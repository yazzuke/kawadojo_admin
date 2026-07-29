import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-kawa-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kawa-green"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si es admin normal y no está en resale-pricing, lo mandamos para allá
  if (user?.role === 'admin' && location.pathname !== '/resale-pricing') {
    return <Navigate to="/resale-pricing" replace />;
  }

  // Si es super_admin y va al root o catch-all que lo mande al dashboard
  if (user?.role === 'super_admin' && (location.pathname === '/' || location.pathname === '')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
