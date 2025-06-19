import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, FileText, Code, Loader } from 'lucide-react';
import AnimatedGradient from '../components/ui/AnimatedGradient';
import Card from '../components/ui/Card';
import { api } from '../services/api';

interface DocSection {
  id: string;
  title: string;
  icon: any;
  content: string;
  color: string;
}

export const DocsPage: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('backend');
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  
  const sections: DocSection[] = [
    {
      id: 'backend',
      title: 'Backend API',
      icon: Code,
      content: '',
      color: 'var(--primary-purple)'
    },
    {
      id: 'frontend',
      title: 'Frontend',
      icon: FileText,
      content: '',
      color: 'var(--primary-teal)'
    }
  ];

  useEffect(() => {
    loadDocContent();
  }, [selectedSection]);

  const loadDocContent = async () => {
    setIsLoading(true);
    try {
      // In production, you'd load from your backend
      // For now, we'll use placeholder content
      const placeholderContent = selectedSection === 'backend' 
        ? `# Backend API Documentation

## Overview
The Social Distribution API is built with Django REST Framework and provides endpoints for social networking functionality.

## Authentication
The API uses token-based authentication. Include your token in the Authorization header:
\`\`\`
Authorization: Token your-token-here
\`\`\`

## Core Endpoints

### Authors
- \`GET /api/authors/\` - List all authors
- \`GET /api/authors/{id}/\` - Get specific author
- \`POST /api/authors/\` - Create new author

### Posts (Entries)
- \`GET /api/entries/\` - List all posts
- \`POST /api/entries/\` - Create new post
- \`PUT /api/entries/{id}/\` - Update post
- \`DELETE /api/entries/{id}/\` - Delete post

### Social Features
- \`POST /api/follow/{author_id}/\` - Follow an author
- \`DELETE /api/follow/{author_id}/\` - Unfollow an author
- \`GET /api/authors/{id}/followers/\` - Get author's followers
- \`GET /api/authors/{id}/following/\` - Get who author follows

### Interactions
- \`POST /api/entries/{id}/like/\` - Like a post
- \`POST /api/entries/{id}/comment/\` - Comment on a post
- \`GET /api/entries/{id}/comments/\` - Get post comments

## Response Format
All responses follow this structure:
\`\`\`json
{
  "count": 10,
  "next": "http://api.example.com/entries/?page=2",
  "previous": null,
  "results": [...]
}
\`\`\``
        : `# Frontend Documentation

## Overview
The Social Distribution frontend is built with React, TypeScript, and Tailwind CSS.

## Project Structure
\`\`\`
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── services/      # API service layer
├── types/         # TypeScript type definitions
├── lib/           # Utilities and helpers
└── styles/        # Global styles
\`\`\`

## Key Features

### Authentication
- JWT token-based authentication
- Persistent login state
- Protected routes

### UI Components
- Glass morphism design system
- Animated gradients
- Responsive layout
- Dark/light theme support

### State Management
- React Context for global state
- Custom hooks for data fetching
- Optimistic UI updates

## Development

### Setup
\`\`\`bash
npm install
npm run dev
\`\`\`

### Building
\`\`\`bash
npm run build
npm run preview
\`\`\`

### Code Style
- ESLint for code quality
- Prettier for formatting
- TypeScript strict mode`;

      setContent(placeholderContent);
    } catch (error) {
      console.error('Error loading documentation:', error);
      setContent('Failed to load documentation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full px-4 lg:px-6 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <AnimatedGradient
            gradientColors={[
              'var(--primary-purple)',
              'var(--primary-pink)',
              'var(--primary-teal)',
            ]}
            className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            duration={15}
          >
            <Book className="w-6 h-6" />
          </AnimatedGradient>
          <div>
            <h1 className="text-2xl font-bold text-text-1">Documentation</h1>
            <p className="text-sm text-text-2">
              Learn how to use Social Distribution
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 overflow-x-auto py-2 mb-6 scrollbar-hide px-2"
      >
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = selectedSection === section.id;
          
          return isActive ? (
            <AnimatedGradient
              key={section.id}
              gradientColors={[
                'var(--primary-purple)',
                'var(--primary-pink)',
                'var(--primary-teal)',
              ]}
              className="px-4 py-2 rounded-lg shadow-md cursor-pointer flex items-center gap-2 flex-shrink-0"
              textClassName="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] flex items-center gap-2"
              duration={20}
              onClick={() => setSelectedSection(section.id)}
            >
              <Icon size={18} />
              <span className="font-medium">{section.title}</span>
            </AnimatedGradient>
          ) : (
            <div
              key={section.id}
              className="px-4 py-2 rounded-lg text-text-2 hover:text-text-1 hover:bg-glass-low transition-all cursor-pointer flex-shrink-0"
              onClick={() => setSelectedSection(section.id)}
            >
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={18} />
                <span className="font-medium">{section.title}</span>
              </motion.div>
            </div>
          );
        })}
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full"
      >
        <Card variant="prominent" className="p-6 lg:p-8">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="glass-card-main rounded-full p-5 shadow-lg"
                >
                  <Loader className="w-8 h-8 text-brand-500" />
                </motion.div>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none relative">
                <div 
                  className="text-text-1 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:mb-6 [&>h1]:text-text-1
                             [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:mt-8 [&>h2]:mb-4 [&>h2]:text-text-1
                             [&>h3]:text-xl [&>h3]:font-medium [&>h3]:mt-6 [&>h3]:mb-3 [&>h3]:text-text-1
                             [&>p]:mb-4 [&>p]:text-text-2 [&>p]:leading-relaxed
                             [&>ul]:list-disc [&>ul]:list-inside [&>ul]:mb-4 [&>ul]:text-text-2
                             [&>li]:mb-2
                             [&>pre]:bg-glass-low [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:mb-4
                             [&>code]:bg-glass-low [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:text-sm [&>code]:text-[var(--primary-teal)]
                             [&>pre>code]:bg-transparent [&>pre>code]:p-0"
                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(content) }}
                />
                {/* Fade out gradient at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-2)] to-transparent pointer-events-none" />
              </div>
            )}
          </Card>
        </motion.div>
    </div>
  );
};

// Simple markdown to HTML converter
function convertMarkdownToHtml(markdown: string): string {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\* (.+)$/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>');
}

export default DocsPage;