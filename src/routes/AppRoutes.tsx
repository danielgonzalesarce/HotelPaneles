import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import PageLoader from './PageLoader';
import { ROUTES } from './paths';

const Home = lazy(() => import('../pages/Home'));
const Rooms = lazy(() => import('../pages/Rooms'));
const RoomDetail = lazy(() => import('../pages/RoomDetail'));
const Reservation = lazy(() => import('../pages/Reservation'));
const Reviews = lazy(() => import('../pages/Reviews'));
const Contact = lazy(() => import('../pages/Contact'));
const Login = lazy(() => import('../pages/Login'));
const AuthCallback = lazy(() => import('../pages/AuthCallback'));
const UserDashboard = lazy(() => import('../pages/UserDashboard'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const SuperAdminDashboard = lazy(() => import('../pages/SuperAdminDashboard'));
const Complaints = lazy(() => import('../pages/Complaints'));
const Legal = lazy(() => import('../pages/Legal'));
const SimulatedCheckout = lazy(() => import('../pages/SimulatedCheckout'));
const NotFound = lazy(() => import('../pages/NotFound'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path={ROUTES.home} element={<Home />} />
        <Route path={ROUTES.rooms} element={<Rooms />} />
        <Route path={`${ROUTES.rooms}/:id`} element={<RoomDetail />} />
        <Route path={ROUTES.reservation} element={<Reservation />} />
        <Route path="/reservacion" element={<Navigate to={ROUTES.reservation} replace />} />
        <Route path={ROUTES.reviews} element={<Reviews />} />
        <Route path="/resenas" element={<Navigate to={ROUTES.reviews} replace />} />
        <Route path={ROUTES.contact} element={<Contact />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.authCallback} element={<AuthCallback />} />
        <Route
          path={`${ROUTES.user.root}/*`}
          element={
            <ProtectedRoute allowedRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${ROUTES.admin.root}/*`}
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${ROUTES.superAdmin.root}/*`}
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path={ROUTES.complaints} element={<Complaints />} />
        <Route path={ROUTES.legal} element={<Legal />} />
        <Route path={ROUTES.checkoutSimulated} element={<SimulatedCheckout />} />
        <Route path={ROUTES.checkout} element={<Navigate to={ROUTES.checkoutSimulated} replace />} />
        <Route
          path="/asistente"
          element={<Navigate to={{ pathname: ROUTES.home, search: '?chat=open' }} replace />}
        />
        <Route
          path="/concierge"
          element={<Navigate to={{ pathname: ROUTES.home, search: '?chat=open' }} replace />}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
