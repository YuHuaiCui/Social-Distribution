import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import { AuthProvider } from "./components/context/AuthContext";
import { CreatePostProvider } from "./components/context/CreatePostContext";
import { PostsProvider } from "./components/context/PostsContext";
import { ToastProvider } from "./components/context/ToastContext";
import { ThemeProvider } from "./lib/theme";


const router = createBrowserRouter(routes);

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <PostsProvider>
            <CreatePostProvider>
              <RouterProvider router={router} />
            </CreatePostProvider>
          </PostsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;