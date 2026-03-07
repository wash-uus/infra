import { Navigate } from "react-router-dom";

// All roles use the single unified Dashboard — just redirect there.
export default function DashboardPage() {
  return <Navigate to="/dashboard" replace />;
}
