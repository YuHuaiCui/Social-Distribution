import { type RouteObject } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import HomePage from "./pages/HomePage";
import Protected from "./components/protected/Protected";
import AuthCallback from "./components/auth/AuthCallback";
import Profile from "./components/profile/Profile";
import InboxPage from "./pages/InboxPage";
import ExplorePage from "./pages/ExplorePage";
import PostDetailPage from "./pages/PostDetailPage";
import SettingsPage from "./pages/SettingsPage";
import SearchResultsPage from "./pages/SearchResultsPage";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
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
        path: "/authors/:authorId",
        element: (
          <Protected>
            <Profile />
          </Protected>
        ),
      },
      {
        path: "/profile",
        element: (
          <Protected>
            <Profile />
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
];