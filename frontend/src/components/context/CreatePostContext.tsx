import React, { createContext, useContext, useState } from 'react';
import CreatePostModal from '../CreatePostModal';
import type { Entry } from '../../types/models';

interface CreatePostContextType {
  openCreatePost: () => void;
  closeCreatePost: () => void;
  isOpen: boolean;
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

  const openCreatePost = () => setIsOpen(true);
  const closeCreatePost = () => setIsOpen(false);

  const handleSuccess = (post: Entry) => {
    onPostCreated?.(post);
    // You can add a toast notification here
  };

  return (
    <CreatePostContext.Provider value={{ openCreatePost, closeCreatePost, isOpen }}>
      {children}
      <CreatePostModal 
        isOpen={isOpen} 
        onClose={closeCreatePost}
        onSuccess={handleSuccess}
      />
    </CreatePostContext.Provider>
  );
};

export default CreatePostProvider;