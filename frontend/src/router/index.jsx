import { Navigate, createBrowserRouter } from "react-router-dom";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import ContentPage from "../pages/ContentPage";
import DashboardPage from "../pages/DashboardPage";
import DiscipleshipPage from "../pages/DiscipleshipPage";
import GroupsPage from "../pages/GroupsPage";
import HomePage from "../pages/HomePage";
import HubsPage from "../pages/HubsPage";
import LoginPage from "../pages/LoginPage";
import MessagesPage from "../pages/MessagesPage";
import PrayerPage from "../pages/PrayerPage";
import RegisterPage from "../pages/RegisterPage";
import StoryPage from "../pages/StoryPage";
import GalleryPage from "../pages/GalleryPage";
import WorshipPage from "../pages/WorshipPage";
import NotFoundPage from "../pages/NotFoundPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";

// Role-specific dashboard pages
import UserDashboard from "../pages/dashboard/UserDashboard";
import ModeratorDashboard from "../pages/dashboard/ModeratorDashboard";
import HubLeaderDashboard from "../pages/dashboard/HubLeaderDashboard";
import AdminDashboard from "../pages/dashboard/AdminDashboard";
import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import ProfilePage from "../pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      // /dashboard → role-dispatch redirect
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      // Role-specific dashboard routes
      {
        path: "user-dashboard",
        element: (
          <ProtectedRoute roles={["member"]}>
            <UserDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "moderator-dashboard",
        element: (
          <ProtectedRoute roles={["moderator"]}>
            <ModeratorDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "hub-leader-dashboard",
        element: (
          <ProtectedRoute roles={["hub_leader"]}>
            <HubLeaderDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin-dashboard",
        element: (
          <ProtectedRoute roles={["admin", "super_admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "super-admin-dashboard",
        element: (
          <ProtectedRoute roles={["super_admin"]}>
            <SuperAdminDashboard />
          </ProtectedRoute>
        ),
      },
      { path: "content", element: <ContentPage /> },
      { path: "gallery", element: <GalleryPage /> },
      { path: "groups", element: <GroupsPage /> },
      {
        path: "messages",
        element: (
          <ProtectedRoute>
            <MessagesPage />
          </ProtectedRoute>
        ),
      },
      { path: "prayer", element: <PrayerPage /> },
      { path: "discipleship", element: <DiscipleshipPage /> },
      { path: "hubs", element: <HubsPage /> },
      { path: "worship", element: <WorshipPage /> },
      { path: "stories/:id", element: <StoryPage /> },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dashboard/profile",
        element: <Navigate to="/profile" replace />,
      },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
