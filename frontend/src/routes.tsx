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
import ExplorePage from "./pages/ExplorePage";
import PostDetailPage from "./pages/PostDetailPage";
import SettingsPage from "./pages/SettingsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import NotFoundPage from "./pages/NotFoundPage";
import FriendsPage from "./pages/FriendsPage";
import AuthorProfilePage from "./pages/AuthorProfilePage";
import LikedPostsPage from "./pages/LikedPostsPage";
import FollowRequestsPage from "./pages/FollowRequestsPage";
import DocsPage from "./pages/DocsPage";
import AboutPage from "./pages/AboutPage";
import PrivacyPage from "./pages/PrivacyPage";
import NodeManagementPage from "./pages/NodeManagementPage";

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
        element: <PostDetailPage />,
      },
      {
        path: "/posts/remote/:entryUrl",
        element: <PostDetailPage />,
      },
      {
        path: "/settings",
        element: (
          <Protected>
            <SettingsPage />
          </Protected>
        ),
      },
      {
        path: "/node-management",
        element: (
          <Protected>
            <NodeManagementPage />
          </Protected>
        ),
      },
      {
        path: "/authors/:id",
        element: (
          <Protected>
            <AuthorProfilePage />
          </Protected>
        ),
      },
      {
        path: "/authors/:id/followers",
        element: (
          <Protected>
            <FriendsPage defaultFilter="followers" />
          </Protected>
        ),
      },
      {
        path: "/authors/:id/following",
        element: (
          <Protected>
            <FriendsPage defaultFilter="following" />
          </Protected>
        ),
      },
      {
        path: "/authors/*",
        element: (
          <Protected>
            <AuthorProfilePage />
          </Protected>
        ),
      },

      {
        path: "/liked",
        element: (
          <Protected>
            <LikedPostsPage />
          </Protected>
        ),
      },
      {
        path: "/follow-requests",
        element: (
          <Protected>
            <FollowRequestsPage />
          </Protected>
        ),
      },
      {
        path: "/docs",
        element: <DocsPage />,
      },
      {
        path: "/about",
        element: <AboutPage />,
      },
      {
        path: "/privacy",
        element: <PrivacyPage />,
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
