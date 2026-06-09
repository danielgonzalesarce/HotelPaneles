import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AIConcierge from './components/AIConcierge';
import StorageBootstrap from './components/StorageBootstrap';
import ScrollToTop from './components/ScrollToTop';
import AppRoutes from './routes/AppRoutes';
import { isAuthPath, isPanelPath, ROUTES } from './routes/paths';
import { useTenant } from './TenantContext';
import { getTenantPermissions } from './utils/tenantPermissions';
import { TenantProvider } from './TenantContext';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const location = useLocation();
  const { currentTenant } = useTenant();
  const tenantPermissions = getTenantPermissions(currentTenant);
  const pathname = location.pathname;
  const isPanel = isPanelPath(pathname);
  const isAuth = isAuthPath(pathname);
  const showNavbar = !isPanel && !isAuth;
  const showPublicChrome = !isPanel && !isAuth && pathname !== ROUTES.login;
  const showChatbot = showPublicChrome && tenantPermissions.chatbot;

  return (
    <div className="min-h-screen bg-white flex flex-col w-full overflow-x-clip">
      {showNavbar && <Navbar />}
      <StorageBootstrap>
        <ScrollToTop />
        <main className="flex-grow w-full min-w-0">
          <AppRoutes />
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
