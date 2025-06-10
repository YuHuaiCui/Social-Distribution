import { type RouteObject } from "react-router-dom";
import Auth from "./components/auth/Auth";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Auth />,
  },
];
