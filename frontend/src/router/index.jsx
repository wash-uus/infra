import { Navigate, createBrowserRouter } from "react-router-dom";
import React, { Suspense } from "react";

import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import PageLoader from "../components/PageLoader";

// Heavy pages — lazy loaded with code splitting
const ContentPage = React.lazy(() => import("../pages/ContentPage"));
const CoursePage = React.lazy(() => import("../pages/CoursePage"));
const LessonPage = React.lazy(() => import("../pages/LessonPage"));
const GalleryPage = React.lazy(() => import("../pages/GalleryPage"));

// Standard pages — imported normally
import DiscipleshipPage from "../pages/DiscipleshipPage";
import GroupsPage from "../pages/GroupsPage";
import HomePage from "../pages/HomePage";
import HubsPage from "../pages/HubsPage";
import LoginPage from "../pages/LoginPage";
import MessagesPage from "../pages/MessagesPage";
import PrayerPage from "../pages/PrayerPage";
import RegisterPage from "../pages/RegisterPage";
import StoryPage from "../pages/StoryPage";
import StorySubmissionPage from "../pages/StorySubmissionPage";
import WorshipPage from "../pages/WorshipPage";
import BeneathTheCrownPage from "../pages/BeneathTheCrownPage";
import NotFoundPage from "../pages/NotFoundPage";
import VerifyEmailPage from "../pages/VerifyEmailPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import Dashboard from "../pages/dashboard/Dashboard";
import ProfilePage from "../pages/ProfilePage";
import ProfileSettingsPage from "../pages/ProfileSettingsPage";

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
      {
        path: "content",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ContentPage />
          </Suspense>
        ),
      },
      {
        path: "gallery",
        element: (
          <Suspense fallback={<PageLoader />}>
            <GalleryPage />
          </Suspense>
        ),
      },
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
      {
        path: "discipleship/course/:courseId",
        element: (
          <Suspense fallback={<PageLoader />}>
            <CoursePage />
          </Suspense>
        ),
      },
      {
        path: "discipleship/course/:courseId/lesson/:lessonId",
        element: (
          <Suspense fallback={<PageLoader />}>
            <LessonPage />
          </Suspense>
        ),
      },
      { path: "hubs", element: <HubsPage /> },
      { path: "worship", element: <WorshipPage /> },
      { path: "book/beneath-the-crown", element: <BeneathTheCrownPage /> },
      { path: "stories/submit", element: <StorySubmissionPage /> },
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
        path: "profile/settings",
        element: (
          <ProtectedRoute>
            <ProfileSettingsPage />
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
