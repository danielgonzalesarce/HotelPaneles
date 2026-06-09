import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getDashboardPathForRole } from '../services/authService';
import type { User } from '../types';
import { ROUTES } from './paths';

type Role = User['role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Roles permitidos. Si se omite, basta con estar autenticado. */
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to={getDashboardPathForRole(currentUser.role)} replace />;
  }

  return <>{children}</>;
}
