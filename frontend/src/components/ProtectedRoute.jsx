/**
 * ProtectedRoute
 *
 * Usage:
 *   <ProtectedRoute>…</ProtectedRoute>              — any authenticated user
 *   <ProtectedRoute roles={["admin","super_admin"]}> — only those roles
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    // Authenticated but wrong role — send to their own dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
