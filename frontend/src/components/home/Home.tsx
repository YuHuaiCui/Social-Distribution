import React from "react";
import { useAuth } from "../Context/AuthContext";

function Home() {
  const { user } = useAuth();
  return (
    <div>
      <a href={`home/authors/${user.id}`}>click me</a>
    </div>
  );
}

export default Home;
