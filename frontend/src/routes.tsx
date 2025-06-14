import { type RouteObject } from "react-router-dom";
import Auth from "./components/auth/Auth";
import Home from "./components/home/Home";
import Protected from "./components/protected/Protected";
import AuthCallback from "./components/auth/AuthCallback";
import Profile from "./components/profile/Profile";
import AuthorProfile from "./components/author/AuthorProfile";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Auth />,
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
    path: "/home/authors/:authorId",
    element: (
      <Protected>
        <AuthorProfile />
      </Protected>
    ),
  },

  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    path: "/home",
    element: (
      <Protected>
        <Home />
      </Protected>
    ),
  },
  {
    path: "*",
    element: <div>404 Not Found</div>,
  },
];
