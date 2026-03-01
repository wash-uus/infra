/**
 * DashboardPage — role-dispatch redirect.
 * Reads the authenticated user's role from AuthContext and immediately
 * redirects to the matching role-specific dashboard route.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_ROUTES = {
  member: "/user-dashboard",
  moderator: "/moderator-dashboard",
  hub_leader: "/hub-leader-dashboard",
  admin: "/admin-dashboard",
  super_admin: "/super-admin-dashboard",
};

export default function DashboardPage() {
  const { role } = useAuth();
  const to = ROLE_ROUTES[role] ?? "/user-dashboard";
  return <Navigate to={to} replace />;
}
