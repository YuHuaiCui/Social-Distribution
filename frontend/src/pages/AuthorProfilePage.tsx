import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { Entry, Author } from '../types/models';
import { api } from '../services/api';
import AuthorCard from '../components/AuthorCard';
import PostCard from '../components/PostCard'; // you already have this

const AuthorProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState<Author | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      try {
        const [authorData, postData] = await Promise.all([
          api.getAuthor(id!),                    // fetch author
          api.getAuthorEntries(id!)              // fetch entries (needs to be implemented)
        ]);
        setAuthor(authorData);
        setEntries(postData);
      } catch (err) {
        console.error('Error loading profile or posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [id]);

  if (loading) return <p>Loading profile...</p>;
  if (!author) return <p>Author not found.</p>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <AuthorCard author={author} variant="detailed" showStats showBio showActions />
      {entries.length > 0 ? (
        <div className="space-y-4">
          {entries.map((entry) => (
            <PostCard key={entry.id} post={entry} />
          ))}
        </div>
      ) : (
        <p className="text-text-2">This author hasn’t posted anything yet.</p>
      )}
    </div>
  );
};

export default AuthorProfilePage;



