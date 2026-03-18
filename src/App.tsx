import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/Products';
import CategoriesPage from './pages/Categories';
import ModelsPage from './pages/Models';
import BatchTabsPage from './pages/BatchTabs';
import OrdersPage from './pages/Orders';
import BatchInfoPage from './pages/Batchinfo';
import OrderInfoPage from './pages/OrderInfo';
import FinancialResumePage from './pages/FinancialResume';
import ReviewsPage from './pages/Reviews';
import ClientReviewPage from './pages/ClientReview';
import TestimonialsPage from './pages/Testimonials';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/review/:token" element={<ClientReviewPage />} />
          <Route path="/testimonios" element={<TestimonialsPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/batches" element={<BatchTabsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderInfoPage />} />
              <Route path="/financial" element={<FinancialResumePage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
            </Route>
          </Route>

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App