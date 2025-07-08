import React, { createContext, useContext, useState } from 'react';
import CreatePostModal from '../CreatePostModal';
import type { Entry } from '../../types/models';

interface CreatePostContextType {
  openCreatePost: (editPost?: Entry) => void;
  closeCreatePost: () => void;
  isOpen: boolean;
  editingPost?: Entry;
}

const CreatePostContext = createContext<CreatePostContextType | undefined>(undefined);

export const useCreatePost = () => {
  const context = useContext(CreatePostContext);
  if (!context) {
    throw new Error('useCreatePost must be used within CreatePostProvider');
  }
  return context;
};

interface CreatePostProviderProps {
  children: React.ReactNode;
  onPostCreated?: (post: Entry) => void;
}

export const CreatePostProvider: React.FC<CreatePostProviderProps> = ({ 
  children,
  onPostCreated 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Entry | undefined>();

  const openCreatePost = (editPost?: Entry) => {
    setEditingPost(editPost);
    setIsOpen(true);
  };

  const closeCreatePost = () => {
    setIsOpen(false);
    setEditingPost(undefined);
  };

  const handleSuccess = (post: Entry) => {

    // 📢 Notify parent (e.g. post feed)
    onPostCreated?.(post);
    closeCreatePost();
  };

  return (
    <CreatePostContext.Provider value={{ openCreatePost, closeCreatePost, isOpen, editingPost }}>
      {children}
      <CreatePostModal 
        isOpen={isOpen} 
        onClose={closeCreatePost}
        onSuccess={handleSuccess}
        editingPost={editingPost}
      />
    </CreatePostContext.Provider>
  );
};

export default CreatePostProvider;

