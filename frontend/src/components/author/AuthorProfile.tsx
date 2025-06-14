import React, { useEffect, useState } from "react";
import { useAuth } from "../Context/AuthContext";

type Entry = {
  id: string;
  title: string;
  content: string;
  content_type: string;
  created_at: string;
};

const AuthorProfile = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const url = `${import.meta.env.VITE_API_URL}/api/authors/${
      user.id
    }/entries`;
    console.log("Fetching entries from:", url);

    fetch(url, {
      credentials: "include",
    })
      .then((res) => {
        console.log("Response status:", res.status);
        return res.text(); // Use .text() first to see raw response
      })
      .then((text) => {
        console.log("Raw response body:", text);
        try {
          const data = JSON.parse(text);
          console.log("Parsed data:", data);
          setEntries(data);
        } catch (e) {
          console.error("JSON parse failed. Response wasn't valid JSON:", e);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch entries:", err);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <p>Loading public entries...</p>;
  if (!entries.length) return <p>No public entries found.</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Public Entries</h2>
      {entries.map((entry) => (
        <div key={entry.id} className="border p-4 rounded shadow-sm">
          <h3 className="font-semibold">{entry.title}</h3>
          <p className="text-sm text-gray-600">
            {new Date(entry.created_at).toLocaleString()}
          </p>
          <div className="mt-2">
            {entry.content_type === "text/markdown" ? (
              <pre>{entry.content}</pre>
            ) : (
              <p>{entry.content}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuthorProfile;
