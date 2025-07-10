# Social Distribution Frontend

This is the frontend application for the Social Distribution project, built with React, TypeScript, Vite, React Router, Tailwind CSS, and Framer Motion for modern web development with beautiful animations and styling.

## 📋 Current Frontend Status

### Overview
The frontend is fully functional with all required pages, UI components, and backend integration. The application features a modern glassmorphism design with theme-aware styling, smooth animations, and responsive layouts. All major features are working including authentication, post creation with image uploads, friends feed, and social interactions.

### Quick Reference Table

| Page | Route | UI Status | Data Status | Features |
|------|-------|-----------|-------------|----------|
| Login | `/` | ✅ Complete | ✅ Working | Session & GitHub OAuth |
| Sign Up | `/signup` | ✅ Complete | ✅ Working | User registration |
| Home | `/home` | ✅ Complete | ✅ Working | All/Friends/Liked feeds |
| Profile | `/profile/:id` | ✅ Complete | ✅ Working | User posts & info |
| Friends | `/friends` | ✅ Complete | ✅ Working | Friends/Following/Followers |
| Explore | `/explore` | ✅ Complete | ✅ Working | Discover users & posts |
| Inbox | `/inbox` | ✅ Complete | ✅ Working | Notifications & requests |
| Settings | `/settings` | ✅ Complete | ✅ Working | Profile & privacy settings |
| Post Detail | `/posts/:id` | ✅ Complete | ✅ Working | Comments & interactions |
| Create Post | Modal | ✅ Complete | ✅ Working | Text/Markdown/Image posts |

**Legend:**
- ✅ Complete - Fully implemented with backend integration
- ✅ Working - Connected to backend API and functioning

### Key Features

#### 🎯 Working Features

1. **Authentication System**
   - Session-based login with CSRF protection
   - User registration with email/password
   - GitHub OAuth integration
   - Remember me functionality (30-day persistence)
   - Protected routes and automatic redirects

2. **Content Creation**
   - Create posts with text, Markdown, or images
   - Image uploads stored as blobs in database
   - Privacy controls (Public, Friends-only, Unlisted)
   - Category tagging system
   - Real-time Markdown preview
   - Fullscreen editing mode

3. **Social Features**
   - Follow/unfollow users with pending request management
   - Friends system (mutual follows)
   - Like posts with real-time count updates
   - Comment on posts with Markdown support
   - Share posts via Web Share API or to user inbox
   - Save/bookmark posts for later

4. **Content Discovery**
   - **Home Feed** with three views:
     - All Posts: Public posts from all users
     - Friends Feed: All posts from friends (mutual follows)
     - Liked Posts: Posts you've liked
   - **Explore Page** for discovering new users and content
   - **Profile Pages** showing user posts and information
   - **Search** functionality for finding users

5. **Inbox & Notifications**
   - Real-time notifications for likes, comments, and follows
   - Follow request management with accept/decline
   - Shared post notifications
   - Admin-only report visibility
   - Mark as read functionality

6. **User Experience**
   - Dark/Light theme with system preference detection
   - Responsive design for all screen sizes
   - Smooth animations with Framer Motion
   - Loading states and error handling
   - Toast notifications for user feedback
### Recent Improvements (January 2025)

- **Friends Feed**: Fixed to show all posts from friends (mutual follows)
- **Image Storage**: Migrated to database blob storage for reliability
- **UI Polish**: Fixed tab flickering, input opacity, button separators
- **Share Feature**: Added Web Share API with clipboard fallback
- **Admin Features**: Report visibility limited to admin users
- **Code Quality**: Removed debug console.log statements
- **TypeScript**: Fixed type safety issues

## 🚀 Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn package manager

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

**Congratulations! You are now running the React app** 🎉

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production

## 📚 Documentation & Resources

- [React Documentation](https://react.dev/) - Learn React fundamentals
- [React Router Documentation](https://reactrouter.com/) - Client-side routing
- [TypeScript Documentation](https://www.typescriptlang.org/) - TypeScript guide
- [Vite Documentation](https://vitejs.dev/) - Fast build tool
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Utility-first CSS framework
- [Framer Motion Documentation](https://www.framer.com/motion/) - Animation library for React

## 🛠️ Tech Stack

- **React** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations

## 🧪 Testing the Frontend

### With Mock Data (Current State)
1. Start the development server: `npm run dev`
2. Create a new account or use any credentials (authentication is mocked)
3. Explore all pages to see the UI and mock interactions
4. Note that data won't persist between sessions

### With Backend (Future State)
Once the backend is running:
1. Update the `VITE_API_URL` in `.env` to point to your backend
2. Ensure the backend is running with proper CORS configuration
3. Test real authentication, data persistence, and API interactions

## 🎨 UI Features

- **Theme Support**: Dark/Light mode toggle with fully theme-aware components
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Animations**: Smooth transitions and micro-interactions using Framer Motion
- **Glass Morphism**: Modern translucent UI elements with backdrop blur effects
- **Gradient Effects**: Dynamic animated color gradients throughout
- **Accessibility**: ARIA labels and keyboard navigation
- **Interactive Elements**: 
  - Animated post interaction buttons with gradient hover states
  - Thumbs-up animation when liking posts
  - Filled icon states for liked/saved posts
  - Full-width action buttons with visual dividers
- **Visual Polish**:
  - Reduced glass card opacity for better theme consistency
  - Minimal borders for sidebar components
  - Clean 404 page with animated gradient dots
  - Properly extending button dividers in post cards

## ⚠️ Known Issues & Limitations

### Current Limitations
1. **No Data Persistence**: All data is lost on page refresh since backend is not connected
2. **Authentication**: Login/signup forms accept any input as there's no validation
3. **Profile Page Error**: Shows JSON parsing error due to missing backend endpoint
4. **Image Uploads**: File selection works but images aren't saved
5. **Real-time Updates**: Notifications and feed updates are static

### Temporary Behaviors
- **Mock Authentication**: Any username/password combination will log you in
- **Static Counts**: Follower/following numbers don't update
- **Sample Content**: Explore and Inbox show the same mock data for all users
- **No Search Results**: Search bars are UI-only, don't filter content

### Not Implemented (Awaiting Backend)
- Password reset functionality
- Email verification
- Real GitHub OAuth integration
- Post creation and persistence
- Comment system
- Direct messaging
- Node federation features

## 🎯 Recent Updates

### Latest UI Improvements
- **Enhanced PostCard Interactions**: 
  - Full-width button layout with equal spacing
  - Unique gradient colors for each action (like: pink-purple, comment: teal-blue, share: yellow-coral, save: violet-purple)
  - Animated thumbs-up effect when liking posts
  - Hover effects that scale only icons/text, not button containers
- **Fixed Visual Issues**:
  - Filter button gradient coverage in Friends/Explore pages
  - Right sidebar using minimal borders without backgrounds
  - 404 page simplified with animated gradient dots
  - Theme-aware borders and reduced glass card opacity
- **Profile Page**: Now fully theme-aware with no hardcoded colors
- **AuthorCard**: Added semi-transparent glass morphism effects
