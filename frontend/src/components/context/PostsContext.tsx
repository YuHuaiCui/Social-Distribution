import React, { createContext, useContext, useState } from 'react';

interface PostsContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export const usePosts = () => {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used within PostsProvider');
  }
  return context;
};

interface PostsProviderProps {
  children: React.ReactNode;
}

export const PostsProvider: React.FC<PostsProviderProps> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <PostsContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </PostsContext.Provider>
  );
};

export default PostsProvider; 