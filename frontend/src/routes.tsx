import { type RouteObject } from "react-router-dom";
import Auth from "./components/Auth/Auth";
import Home from "./components/Home/Home";
import Protected from "./components/Protected/Protected";
import AuthCallback from "./components/Auth/AuthCallback";
import Profile from "./components/Profile/Profile";
import AuthorProfile from "./components/AuthorProfile/AuthorProfile";

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
