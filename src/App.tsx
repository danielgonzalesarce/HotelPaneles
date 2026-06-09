import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AIConcierge from './components/AIConcierge';
import StorageBootstrap from './components/StorageBootstrap';
import ScrollToTop from './components/ScrollToTop';
import { useTenant } from './TenantContext';
import { getTenantPermissions } from './utils/tenantPermissions';
import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import Reservation from './pages/Reservation';
import Reviews from './pages/Reviews';
import Contact from './pages/Contact';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Complaints from './pages/Complaints';
import Legal from './pages/Legal';
import SimulatedCheckout from './pages/SimulatedCheckout';
import NotFound from './pages/NotFound';

import { TenantProvider } from './TenantContext';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const location = useLocation();
  const { currentTenant } = useTenant();
  const tenantPermissions = getTenantPermissions(currentTenant);
  const isAdminPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/superadmin');
  const isAuthCallback = location.pathname === '/auth/callback';
  const showNavbar = !isAdminPath && !isAuthCallback;
  const showPublicChrome = !isAdminPath && !isAuthCallback && location.pathname !== '/login';
  const showChatbot = showPublicChrome && tenantPermissions.chatbot;

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden w-full">
      {showNavbar && <Navbar />}
      <StorageBootstrap>
        <ScrollToTop />
        <main className="flex-grow w-full min-w-0 overflow-x-hidden">
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/habitaciones" element={<Rooms />} />
          <Route path="/habitaciones/:id" element={<RoomDetail />} />
          <Route path="/reserva" element={<Reservation />} />
          <Route path="/reservacion" element={<Navigate to="/reserva" replace />} />
          <Route path="/reseñas" element={<Reviews />} />
          <Route path="/resenas" element={<Navigate to="/reseñas" replace />} />
          <Route path="/contacto" element={<Contact />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/user/*" element={<UserDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/superadmin/*" element={<SuperAdminDashboard />} />
          <Route path="/reclamaciones" element={<Complaints />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="/checkout-simulado" element={<SimulatedCheckout />} />
          <Route path="/checkout" element={<Navigate to="/checkout-simulado" replace />} />
          <Route path="/asistente" element={<Navigate to={{ pathname: '/', search: '?chat=open' }} replace />} />
          <Route path="/concierge" element={<Navigate to={{ pathname: '/', search: '?chat=open' }} replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </main>
        {showPublicChrome && <Footer />}
        {showPublicChrome && <WhatsAppButton />}
        {showChatbot && <AIConcierge />}
      </StorageBootstrap>
    </div>
  );
}

export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AppContent />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </TenantProvider>
  );
}
