import { type RouteObject } from "react-router-dom";
import Auth from "./components/Auth/Auth";
import Home from "./components/Home/Home";
import Protected from "./components/Protected/Protected";
import AuthCallback from "./components/Auth/AuthCallback";
import Profile from "./components/Profile/Profile";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Auth />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    path: "/home",
    element: (
      <Protected>
        <Profile />
      </Protected>
    ),
  },
];
