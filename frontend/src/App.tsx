import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes";
import { AuthProvider } from "./components/context/AuthContext";
import { CreatePostProvider } from "./components/context/CreatePostContext";
import { ThemeProvider } from "./lib/theme";

const router = createBrowserRouter(routes);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CreatePostProvider>
          <RouterProvider router={router} />
        </CreatePostProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;