import React, { useState } from 'react';
import { Search } from 'lucide-react';
import SearchModal from './SearchModal';

interface SearchBarProps {
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div 
        className={`search-bar-container ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative cursor-pointer">
          <input
            type="text"
            placeholder="Search posts, people, or tags..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 rounded-lg text-white placeholder-gray-400 cursor-pointer hover:bg-gray-800/70 transition-colors"
            readOnly
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </div>

      <SearchModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default SearchBar;