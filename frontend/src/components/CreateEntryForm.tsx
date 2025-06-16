import React, { useState } from 'react';
import { useAuth } from '../components/context/AuthContext';

function getCookie(name: string): string | null {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];
  return cookieValue || null;
}


const CreateEntryForm = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [contentType, setContentType] = useState('text/plain');
  const [message, setMessage] = useState('');

  const { user } = useAuth();
  if (!user) {
    return <p>Please log in to create an entry.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryData = {
      title,
      content,
      visibility,
      content_type: contentType,
    };

    try {
      const response = await fetch(`http://localhost:8000/api/authors/${user?.id}/entries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
        },
        credentials: 'include', //  to include session cookies
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        setMessage('Entry created successfully!');
        setTitle('');
        setContent('');
      } else {
        const err = await response.json();
        setMessage(`Failed: ${JSON.stringify(err)}`);
      }
    } catch (err) {
      setMessage('Network error: ' + err);
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