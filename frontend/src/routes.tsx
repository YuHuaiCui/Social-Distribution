import { type RouteObject, useParams } from "react-router-dom";
import Auth from "./components/auth/Auth";
import Home from "./components/home/Home";
import Protected from "./components/protected/Protected";
import AuthCallback from "./components/auth/AuthCallback";
import AuthorProfile from "./components/author/AuthorProfile";

// Wrapper component to extract authorId from params and pass as prop
function AuthorProfileWrapper() {
  const { authorId } = useParams<{ authorId: string }>();
  console.log("AuthorProfileWrapper -> authorId:", authorId); // ✅ this should print

  if (!authorId) return <div>Invalid author</div>;
  return <AuthorProfile authorId={authorId} />;
}


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

        <Home />

    ),
  },
  {
    path: "/home/authors/:authorId",
    element: (

        <AuthorProfileWrapper />
    ),
  },
  {
    path: "*",
    element: <div>404 Not Found</div>,
  },
];
