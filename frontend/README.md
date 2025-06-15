# Social Distribution Frontend

This is the frontend application for the Social Distribution project, built with React, TypeScript, Vite, React Router, Tailwind CSS, and Framer Motion for modern web development with beautiful animations and styling.

## 📋 Current Frontend Status

### Overview
The frontend is fully designed and implemented with all required pages and UI components. The application features a modern glassmorphism design with theme-aware styling, smooth animations, and responsive layouts. However, since the backend is still under development, some features use mock data or show API errors. Below is a detailed breakdown of each page's functionality.

### Quick Reference Table

| Page | Route | UI Status | Data Status | Backend Needed |
|------|-------|-----------|-------------|----------------|
| Login | `/` | ✅ Complete | 🔧 Mocked | Authentication API |
| Sign Up | `/signup` | ✅ Complete | 🔧 Mocked | Registration API |
| Home | `/home` | ✅ Complete | ⏳ Empty State | Posts API |
| Profile | `/profile` | ✅ Complete | ❌ API Error | Authors API |
| Friends | `/friends` | ✅ Complete | 🔧 Mock Data | Follow/Friends API |
| Explore | `/explore` | ✅ Complete | 🔧 Mock Data | Posts/Search API |
| Inbox | `/inbox` | ✅ Complete | 🔧 Mock Data | Notifications API |
| Settings | `/settings` | ✅ Complete | ⏳ Form Ready | Settings API |

**Legend:**
- ✅ Complete - Fully implemented and styled
- 🔧 Mock Data - Using temporary data for demonstration
- ❌ API Error - Shows error due to missing backend
- ⏳ Ready - UI complete, waiting for backend integration

### Page Functionality Status

#### ✅ Fully Functional (UI Complete)
These pages have complete UI implementation and are ready for backend integration:

1. **Authentication Pages**
   - `/` (Login Page) - Fully styled with GitHub OAuth button
   - `/signup` (Sign Up Page) - Complete registration form
   - Both pages feature animated backgrounds and theme-aware styling

2. **Home Page** (`/home`)
   - Empty state for new users
   - Create post button (opens modal)
   - Post feed ready for backend data
   - Fully responsive layout

3. **Settings Page** (`/settings`)
   - Profile settings tab implemented
   - Form fields for display name, bio, and avatar
   - Additional tabs (Account, Privacy, Node, Appearance) ready for content
   - Save functionality awaits backend

#### ⚠️ Partially Functional (Using Mock Data)
These pages work with mock data and will be fully functional once backend APIs are ready:

1. **Friends Page** (`/friends`)
   - **Mock Data**: User lists for friends, following, and followers
   - **Working**: Tab switching, search UI, follow/unfollow buttons
   - **Awaiting Backend**: Real user data, follow/unfollow API calls

2. **Explore Page** (`/explore`)
   - **Mock Data**: Trending posts and user suggestions
   - **Working**: Filter tabs, search bar, post interactions UI
   - **Awaiting Backend**: Real posts, search functionality, like/share actions

3. **Inbox Page** (`/inbox`)
   - **Mock Data**: Sample notifications (follow requests, likes, comments, shares)
   - **Working**: Notification filtering tabs, accept/decline UI
   - **Awaiting Backend**: Real notifications, action handling

#### ❌ Limited Functionality (API Errors)
These pages show API errors due to missing backend endpoints:

1. **Profile Page** (`/profile`)
   - **Error**: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
   - **Working**: Page layout, edit button, placeholder content
   - **Issue**: Backend `/api/authors/me/` endpoint not available
   - **Awaiting**: User profile data fetching and editing

2. **Post Components**
   - **Create Post Modal**: UI complete, awaits backend
   - **Edit Post**: UI ready, needs backend integration
   - **Post Interactions**: Like, comment, share buttons ready

### Features Using Mock Data

1. **User Data**
   - Profile information (name, bio, avatar)
   - Follow/follower counts
   - User statistics in sidebar
   - Trending tags (technology, design, programming, webdev, opensource)

2. **Posts**
   - Sample posts in Explore page with different categories
   - Post metadata (likes, comments, timestamps)
   - Category tags with animated gradients
   - Interactive buttons with full-width layout

3. **Notifications**
   - Follow requests
   - Post shares
   - Likes and comments

4. **GitHub Activity**
   - Contribution heatmap
   - Activity timeline
   - Mock commit/PR data

### Backend Requirements
For full functionality, the frontend requires these backend endpoints:

- **Authentication**: `/api/auth/login`, `/api/auth/signup`, `/api/auth/github`
- **User Profile**: `/api/authors/me/`, `/api/authors/:id/`
- **Posts**: `/api/posts/`, `/api/posts/:id/`
- **Social**: `/api/follow/`, `/api/unfollow/`, `/api/friends/`
- **Notifications**: `/api/inbox/`, `/api/notifications/`
- **Search**: `/api/search/`

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
