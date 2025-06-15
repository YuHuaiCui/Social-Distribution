import { type RouteObject } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ErrorLayout from "./layouts/ErrorLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import Protected from "./components/protected/Protected";
import PublicOnly from "./components/protected/PublicOnly";
import AuthCallback from "./components/auth/AuthCallback";
import InboxPage from "./pages/InboxPage";
import ExplorePage from "./pages/ExplorePage";
import PostDetailPage from "./pages/PostDetailPage";
import SettingsPage from "./pages/SettingsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import NotFoundPage from "./pages/NotFoundPage";
import FriendsPage from "./pages/FriendsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: (
      <PublicOnly>
        <LoginPage />
      </PublicOnly>
    ),
  },
  {
    path: "/signup",
    element: (
      <PublicOnly>
        <SignupPage />
      </PublicOnly>
    ),
  },
  {
    path: "/forgot-password",
    element: (
      <PublicOnly>
        <ForgotPasswordPage />
      </PublicOnly>
    ),
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: "/home",
        element: (
          <Protected>
            <HomePage />
          </Protected>
        ),
      },
      {
        path: "/inbox",
        element: (
          <Protected>
            <InboxPage />
          </Protected>
        ),
      },
      {
        path: "/explore",
        element: (
          <Protected>
            <ExplorePage />
          </Protected>
        ),
      },
      {
        path: "/friends",
        element: (
          <Protected>
            <FriendsPage />
          </Protected>
        ),
      },
      {
        path: "/search",
        element: (
          <Protected>
            <SearchResultsPage />
          </Protected>
        ),
      },
      {
        path: "/posts/:postId",
        element: (
          <Protected>
            <PostDetailPage />
          </Protected>
        ),
      },
      {
        path: "/settings",
        element: (
          <Protected>
            <SettingsPage />
          </Protected>
        ),
      },
    ],
  },
  // Error pages with separate layout
  {
    element: <ErrorLayout />,
    children: [
      {
        path: "/messages",
        element: <NotFoundPage />,
      },
      {
        path: "/saved",
        element: <NotFoundPage />,
      },
      {
        path: "/notifications",
        element: <NotFoundPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];
