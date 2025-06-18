import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import { AuthProvider } from "./components/context/AuthContext";
import { CreatePostProvider } from "./components/context/CreatePostContext";
import { PostsProvider } from "./components/context/PostsContext";
import { ToastProvider } from "./components/context/ToastContext";
import { NotificationProvider } from "./components/context/NotificationContext";
import { ThemeProvider } from "./lib/theme";


const router = createBrowserRouter(routes);

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <PostsProvider>
              <CreatePostProvider>
                <RouterProvider router={router} />
              </CreatePostProvider>
            </PostsProvider>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;