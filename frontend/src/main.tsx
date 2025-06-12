import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes"; // adjust if your path is different
import { AuthProvider } from "./components/context/AuthContext"; // adjust path if needed

// Ensure you have the correct path to your AuthProvider
// and routes file. The AuthProvider should wrap your application to provide authentication context.

const router = createBrowserRouter(routes);
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);