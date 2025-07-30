import React, { useState } from "react";
import { useAuth } from "../components/context/AuthContext";
import { entryService } from "../services";
import type { CreateEntryData } from "../types";

const CreateEntryForm = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [contentType, setContentType] = useState("text/plain");
  const [message, setMessage] = useState("");

  const { user } = useAuth();
  if (!user) {
    return <p>Please log in to create an entry.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entryData: CreateEntryData = {
      title,
      description,
      content,
      visibility: visibility as CreateEntryData["visibility"],
      contentType: contentType as CreateEntryData["contentType"],
    };

    try {
      await entryService.createEntry(entryData);

      setMessage("Entry created successfully!");
      setTitle("");
      setDescription("");
      setContent("");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      setMessage(`Failed: ${errorMessage}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-semibold mb-4">Create a New Entry</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border px-3 py-2 rounded"
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          className="w-full border px-3 py-2 rounded"
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <textarea
          className="w-full border px-3 py-2 rounded"
          placeholder="Content"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />

        <select
          className="w-full border px-3 py-2 rounded"
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
        >
          <option value="text/plain">Plain Text</option>
          <option value="text/markdown">Markdown</option>
        </select>
        <select
          className="w-full border px-3 py-2 rounded"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
        >
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="friends">Friends Only</option>
        </select>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Post Entry
        </button>
        {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
      </form>
    </div>
  );
};

export default CreateEntryForm;
