import { type RouteObject } from "react-router-dom";
import Auth from "./components/auth/Auth";
import Home from "./components/home/Home";
import Protected from "./components/protected/Protected";
import AuthCallback from "./components/auth/AuthCallback";

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
        <Home />
      </Protected>
    ),
  },
];
