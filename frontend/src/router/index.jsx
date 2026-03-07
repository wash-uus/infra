import { Navigate, createBrowserRouter } from "react-router-dom";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import ContentPage from "../pages/ContentPage";
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
import BeneathTheCrownPage from "../pages/BeneathTheCrownPage";
import NotFoundPage from "../pages/NotFoundPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import Dashboard from "../pages/dashboard/Dashboard";
import ProfilePage from "../pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "dashboard",
        element: (
          <ProtectedRoute>
            <Dashboard />
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
      { path: "book/beneath-the-crown", element: <BeneathTheCrownPage /> },
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
