## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [Component Library](#component-library)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Routing and Navigation](#routing-and-navigation)
9. [Authentication Flow](#authentication-flow)
10. [UI/UX Patterns](#uiux-patterns)
11. [Development Setup](#development-setup)
12. [Environment Variables](#environment-variables)
13. [Testing Approach](#testing-approach)
14. [Build and Deployment](#build-and-deployment)
15. [Code Conventions](#code-conventions)
16. [Federation Features](#federation-features)
17. [Recent Improvements](#recent-improvements)
18. [Future Improvements](#future-improvements)

## Project Overview

The Social Distribution frontend is a modern React-based single-page application that provides a distributed social networking platform. Built with TypeScript and Vite, it offers a rich user interface for creating and sharing posts, following other users, managing friendships, and interacting with content across federated nodes. The application supports ActivityPub-compatible federation for cross-instance communication.

### Architecture

The application follows a component-based architecture with:
- **React 19** for UI components and state management
- **TypeScript** for type safety and better developer experience
- **Vite** for fast development and optimized production builds
- **Context API** for global state management
- **React Router DOM** for client-side routing
- **Service-based API layer** for backend communication
- **Federation support** for cross-instance social networking

## Tech Stack

### Core Technologies
- **React 19.1.0** - UI library with React Compiler optimization
- **TypeScript 5.8.3** - Static typing for JavaScript
- **Vite 6.3.5** - Build tool and development server
- **React Router DOM 7.6.1** - Client-side routing

### UI and Styling
- **Tailwind CSS 4.1.8** - Utility-first CSS framework with Vite integration
- **Framer Motion 12.18.1** - Animation library
- **Lucide React 0.515.0** - Icon library

### Additional Libraries
- **React Hot Toast 2.5.2** - Toast notifications
- **Sonner 2.0.5** - Alternative toast system
- **liquid-glass-react 1.1.1** - Apple-style liquid glass effects
- **Playwright 1.53.0** - E2E testing framework

### Development Tools
- **ESLint 9.25.0** - Code linting
- **PostCSS & Autoprefixer** - CSS processing
- **React Compiler Plugin** - Performance optimization

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── auth/           # Authentication components
│   │   ├── context/        # Context providers
│   │   ├── layout/         # Layout components
│   │   ├── loader/         # Loading components
│   │   ├── protected/      # Route protection components
│   │   └── ui/             # Base UI components
│   ├── layouts/            # Page layouts
│   ├── lib/                # Utilities and helpers
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   │   ├── auth/          # Authentication services
│   │   ├── author/        # Author/user services
│   │   ├── entry/         # Post/entry services
│   │   ├── follow/        # Follow relationship services
│   │   ├── image/         # Image upload services
│   │   ├── notification/  # Notification/inbox services
│   │   ├── node/          # Federation node services
│   │   └── social/        # Social interaction services
│   ├── types/              # TypeScript type definitions
│   │   ├── auth/          # Authentication types
│   │   ├── author/        # Author/user types
│   │   ├── common/        # Shared types
│   │   ├── entry/         # Post/entry types
│   │   ├── follow/        # Follow relationship types
│   │   └── social/        # Social interaction types
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Application entry point
│   ├── routes.tsx          # Route configuration
│   └── globals.css         # Global styles
├── public/                  # Static assets
├── dist/                    # Production build output
└── Configuration files
```

## Core Features

### 1. User Authentication
- Login/Signup with username and password
- Remember me functionality with extended session persistence
- Session management with automatic expiry
- Protected routes for authenticated users
- GitHub OAuth integration
- Password reset capability

### 2. Content Creation
- Rich text editor with Markdown support
- Image upload with binary database storage
- Privacy controls (Public, Friends-only, Unlisted)
- Category tagging system
- Real-time preview for Markdown content
- Fullscreen editing mode
- Caption support for image posts
- Content type selection (text/plain, text/markdown, image/png, image/jpeg)

### 3. Social Interactions
- Follow/Unfollow users with pending request management
- Friend relationships (mutual follows)
- Like posts with real-time count updates
- Comment on posts with Markdown support
- Share posts via Web Share API or to user inbox
- Bookmark/save posts for later viewing
- Cross-instance interactions

### 4. Content Discovery
- Home feed with multiple views:
  - All Posts: Public posts from all users
  - Friends Feed: All posts from friends (mutual follows)
  - Liked Posts: Posts you've liked
- Explore page for discovering new content
- Search functionality for users and content
- Profile pages with user posts and activity
- Saved posts collection with easy access
- Trending posts based on engagement

### 5. Inbox System
- Notifications for likes, comments, and follows
- Friend request management
- Shared post notifications
- Mark as read functionality
- ActivityPub-compatible inbox for federation
- Real-time notification updates

### 6. User Profiles
- Customizable display name
- Profile image upload
- GitHub integration with activity display
- Activity feed
- Follower/Following management
- Remote author profile viewing

### 7. Federation Support
- Node management interface
- Remote author discovery and following
- Cross-instance content sharing
- ActivityPub-compatible communication
- Remote post viewing and interaction
- Federation status monitoring

## Component Library

### Core UI Components

#### Button Component
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}
```

#### Card Component
```typescript
// components/ui/Card.tsx
// Provides consistent card styling with shadow and rounded corners
```

#### Input Component
```typescript
// components/ui/Input.tsx
// Styled form inputs with error state support
```

### Feature Components

#### PostCard
- Displays individual posts with author info
- Supports different content types (text, markdown, images)
- Interactive elements (like, comment, share)
- Privacy indicators
- Federation status indicators
- Real-time like count updates

#### AuthorCard
- User profile display
- Follow/unfollow actions
- Quick stats (posts, followers, following)
- Remote author indicators
- GitHub activity integration

#### CreatePostModal
- Modal-based post creation
- Real-time preview
- Privacy selection
- Category management
- Image upload support
- Markdown editor integration

#### NodeManagement
- Node CRUD operations
- Authentication status monitoring
- Remote author discovery
- Federation configuration
- Connection testing

#### SearchModal
- Global search functionality
- User and content search
- Real-time search results
- Search history
- Advanced filtering

#### ShareModal
- Post sharing interface
- Web Share API integration
- Clipboard fallback
- Social media sharing
- Direct user sharing

## State Management

The application uses React Context API for global state management:

### AuthContext
```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: Author | null;
  login: (rememberMe?: boolean, userData?: Author) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUser: (user: Author) => void;
}
```

### PostsContext
- Manages global posts state
- Handles post CRUD operations
- Provides optimistic updates
- Supports federation content
- Real-time updates

### CreatePostContext
- Controls post creation modal state
- Manages draft state
- Handles form submission
- Image upload management
- Preview generation

### ToastContext
- Centralized toast notification system
- Success/error/info message display
- Auto-dismiss functionality

### NotificationContext
- Manages notification state
- Real-time notification updates
- Inbox integration
- Mark as read functionality

### ThemeProvider
- Dark/light mode management
- System preference detection
- Persistent theme selection

## API Integration

### Service Architecture

The application uses a service-based architecture for API communication:

```typescript
// services/base.ts
class BaseService {
  protected async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T>
```

### Key Services

1. **AuthService** - Authentication operations
2. **AuthorService** - User management
3. **EntryService** - Post CRUD operations
4. **FollowService** - Follow relationships
5. **NotificationService** - Inbox and notifications
6. **SocialService** - Likes and comments
7. **ImageService** - Image upload and management
8. **NodeService** - Federation and node management

### API Error Handling
- Centralized error interceptors
- Automatic retry logic
- User-friendly error messages
- Network status detection
- Federation error handling
- CSRF token management

### Deprecated API Service
- The main `api.ts` file is deprecated
- Individual service classes are preferred
- Backwards compatibility maintained

## Routing and Navigation

### Route Structure

```typescript
// Protected routes
/home              - User home feed
/explore           - Discover new content
/friends           - Friend management
/search            - Search results
/posts/:postId     - Post detail view
/posts/remote/:entryUrl - Remote post view
/settings          - User settings
/node-management   - Federation node management
/liked             - Liked posts
/follow-requests   - Follow request management
/docs              - Documentation

// Public routes
/                  - Login page
/signup            - Registration
/forgot-password   - Password reset
/auth/callback     - OAuth callback
```

### Route Protection

- `Protected` component wraps authenticated routes
- `PublicOnly` component redirects logged-in users
- Automatic redirect to login for unauthenticated access
- Admin-only routes for node management

## Authentication Flow

### Login Process
1. User enters credentials
2. API validation
3. Session cookie set
4. User data stored in context
5. Optional "Remember Me" for extended session
6. Redirect to home page

### Session Management
- Extended session with "Remember Me"
- Automatic session refresh
- Logout clears all auth data
- CSRF token management

### Security Features
- CSRF token management
- Secure cookie handling
- Password strength validation
- Rate limiting awareness

## UI/UX Patterns

### Design System

#### Liquid Glass Effects
- Apple-style glassmorphism using `liquid-glass-react` library
- Three variants: `default`, `subtle`, `prominent`
- Applied to major UI components:
  - PostCard and AuthorCard
  - SearchBar and SearchModal results
  - Profile and notification dropdowns
  - Floating menus
- Wrapper components:
  - `LiquidGlassCard`: General purpose wrapper
  - `LiquidGlassSearchBar`: Optimized for search inputs
  - `LiquidGlassFloatingMenu`: For dropdown menus

#### Color Palette
- Dynamic theme support (light/dark)
- CSS variables for consistency
- Tailwind utility classes

#### Typography
- System font stack
- Responsive sizing
- Consistent spacing

#### Components
- Consistent border radius
- Shadow depths
- Interactive states
- Loading skeletons

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interactions
- Adaptive layouts

### Animations
- Framer Motion for complex animations
- CSS transitions for simple effects
- Loading states
- Page transitions

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Type checking
npm run build:check
```

### Development Server
- Runs on http://localhost:5173
- Hot Module Replacement enabled
- Fast refresh for React components
- Overlay disabled for better UX

## Environment Variables

Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8000

# Feature Flags
VITE_ENABLE_GITHUB_ACTIVITY=true
VITE_ENABLE_MARKDOWN_PREVIEW=true
VITE_ENABLE_FEDERATION=true

# External Services
VITE_GITHUB_API_URL=https://api.github.com
```

## Testing Approach

### Unit Testing Strategy
- Component testing with React Testing Library
- Service layer testing with mocked APIs
- Utility function testing

### E2E Testing
- Playwright for end-to-end tests
- Critical user flows covered
- Cross-browser testing

### Test Structure
```
tests/
├── unit/
│   ├── components/
│   ├── services/
│   └── utils/
└── e2e/
    ├── auth.spec.ts
    ├── posts.spec.ts
    ├── social.spec.ts
    └── federation.spec.ts
```

## Build and Deployment

### Build Process

```bash
# Production build
npm run build

# Output in dist/ directory
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── [other static assets]
```

### Optimization
- Code splitting by route
- Tree shaking
- Minification
- Asset optimization
- React Compiler for performance

### Deployment Options
1. **Static hosting** (Netlify, Vercel)
2. **Traditional server** with nginx
3. **Docker container**
4. **Heroku** (configured)

## Code Conventions

### TypeScript Guidelines
- Strict mode enabled
- Explicit return types
- Interface over type for objects
- Proper null checking
- Comprehensive type definitions

### React Best Practices
- Functional components only
- Custom hooks for logic reuse
- Memoization where appropriate
- Proper dependency arrays
- React 19 features utilization

### File Naming
- PascalCase for components
- camelCase for utilities
- kebab-case for CSS modules
- Index files for clean imports

### Code Style
- ESLint configuration enforced
- Prettier for formatting
- Import order conventions
- Comments for complex logic

## Federation Features

### Node Management
- **Node CRUD Operations**: Add, update, delete federated nodes
- **Authentication Status**: Monitor node connectivity and authentication
- **Remote Author Discovery**: Browse and follow authors from remote instances
- **Federation Configuration**: Manage cross-instance communication settings

### Remote Content Integration
- **Cross-Instance Posts**: View and interact with posts from remote nodes
- **Remote Author Profiles**: Access profiles and content from federated instances
- **Federation Indicators**: Visual indicators for remote content and authors
- **ActivityPub Compliance**: Support for ActivityPub protocol communication

### Federation UI Components
- **NodeStatusIndicator**: Shows connection status for remote nodes
- **RemoteAuthorCard**: Specialized display for remote authors
- **FederationSettings**: Configuration interface for federation preferences
- **CrossInstanceFeed**: Dedicated feed for content from remote instances

### Federation Workflows
1. **Node Discovery**: Browse available federated nodes
2. **Authentication Setup**: Configure credentials for remote nodes
3. **Content Synchronization**: Automatic content fetching from remote nodes
4. **Interaction Propagation**: Likes, comments, and follows sent to remote instances

## Recent Improvements

### Major Updates (January 2025)
- **React 19 Migration**: Upgraded to React 19.1.0 with React Compiler optimization
- **TypeScript Enhancement**: Improved type safety with comprehensive type definitions
- **Service Architecture**: Migrated from monolithic API service to individual service classes
- **Federation Support**: Comprehensive node management and remote content integration
- **UI/UX Improvements**:
  - Liquid glass effects throughout the application
  - Improved responsive design
  - Enhanced accessibility
  - Better loading states and animations
- **Content Management**:
  - Enhanced Markdown editor with real-time preview
  - Improved image upload with binary storage
  - Better privacy controls
  - Category tagging system
- **Social Features**:
  - Real-time like and comment updates
  - Enhanced follow management
  - Improved inbox system
  - Better search functionality

### Technical Improvements
- **Performance**: React Compiler optimization and code splitting
- **Error Handling**: Centralized error management with user-friendly messages
- **State Management**: Improved context providers with better separation of concerns
- **API Integration**: Service-based architecture with better error handling
- **Type Safety**: Comprehensive TypeScript types for all data structures

### New Features
- **Node Management Page**: Complete CRUD interface for federated nodes
- **Remote Author Discovery**: Browse and follow authors from remote instances
- **Cross-Instance Content**: View and interact with posts from federated nodes
- **Federation Status Monitoring**: Real-time status of remote node connections
- **ActivityPub Integration**: Support for ActivityPub protocol communication
- **Enhanced Search**: Global search with real-time results
- **Share Functionality**: Web Share API with clipboard fallback

## Future Improvements

### Performance Enhancements
- [ ] Implement virtual scrolling for long feeds
- [ ] Add service worker for offline support
- [ ] Optimize bundle size with dynamic imports
- [ ] Implement image lazy loading
- [ ] Add request caching layer
- [ ] Optimize federation content loading
- [ ] React Compiler optimizations

### Feature Additions
- [ ] Real-time notifications with WebSockets
- [ ] Rich text editor improvements
- [ ] Video content support
- [ ] Direct messaging system
- [ ] Advanced search filters
- [ ] User blocking functionality
- [ ] Content moderation tools
- [ ] Enhanced federation features
- [ ] Cross-instance direct messaging
- [ ] Federation analytics and monitoring

### Technical Debt
- [ ] Complete migration from deprecated API service
- [ ] Add comprehensive test coverage
- [ ] Implement error boundaries
- [ ] Add performance monitoring
- [ ] Improve accessibility (ARIA)
- [ ] Add internationalization (i18n)
- [ ] Enhance federation error handling

### Developer Experience
- [ ] Add Storybook for component documentation
- [ ] Implement visual regression testing
- [ ] Add commit hooks for code quality
- [ ] Create component generator scripts
- [ ] Improve TypeScript types coverage
- [ ] Add federation development tools

### Infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Add environment-specific builds
- [ ] Implement feature flags system
- [ ] Add analytics integration
- [ ] Set up error tracking (Sentry)
- [ ] Federation monitoring and alerting

### Federation Enhancements
- [ ] Advanced node discovery protocols
- [ ] Improved cross-instance content synchronization
- [ ] Enhanced ActivityPub compliance
- [ ] Federation performance optimization
- [ ] Cross-instance user blocking
- [ ] Federation content moderation tools

---

## Contributing

Please refer to the main project README for contribution guidelines. Ensure all code follows the established conventions and passes linting before submitting pull requests.

## License

This project is licensed under the MIT License. See the LICENSE file in the root directory for details.