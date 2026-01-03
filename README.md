# 🌐 Social Distribution - Distributed Social Network

<div align="center">

_A modern, federated social networking platform that breaks down the walls between social media instances_

[🎥 **Watch Demo Video**](https://youtube.com/watch?v=xrVt6h0fLqs) • [📚 **Documentation**](docs/)

---

**Built with cutting-edge tech** • **Fully federated** • **Real-time updates** • **Modern UI/UX**

</div>

## 🎯 The Challenge We Solved

Traditional social media platforms create isolated silos where users can't interact across different services. We built **Social Distribution** to solve this problem by creating a truly distributed social network where users from different instances can seamlessly connect, share content, and interact - just like email works across different providers!

**🌟 What makes us special:**

- 🔗 **True Federation** - Connect with users across different servers
- ⚡ **Real-time Everything** - Live updates, notifications, and interactions
- 🎨 **Beautiful UI** - Modern glassmorphism design with smooth animations
- 🔒 **Privacy First** - Granular privacy controls for all content
- 📱 **Mobile Ready** - Responsive design that works everywhere

## 🎥 Demo & Live Preview

<div align="center">

### 🌟 Watch Our Project in Action!

[![Social Distribution Demo](https://img.youtube.com/vi/xrVt6h0fLqs/maxresdefault.jpg)](https://youtube.com/watch?v=xrVt6h0fLqs)

**[🎬 Click to Watch Full Demo Video](https://youtube.com/watch?v=xrVt6h0fLqs)**

**🚀 Try it yourself!**

| Frontend                           | Backend API                       | Admin Panel                                 |
| ---------------------------------- | --------------------------------- | ------------------------------------------- |
| [React App](http://localhost:5173) | [REST API](http://localhost:8000) | [Django Admin](http://localhost:8000/admin) |
| Modern UI/UX                       | Full API Docs                     | User Management                             |

</div>

## 🏗️ Tech Stack & Architecture

<div align="center">

**💪 Built with the best technologies for maximum performance and scalability**

</div>

### 🔧 Backend

```
🐍 Django 5.2.1         🔄 Django REST Framework    🗄️ PostgreSQL/SQLite
🔐 Session Auth + CSRF   📡 ActivityPub Compatible   🌐 Federation Ready
📨 Real-time Inbox      🖼️ Binary Image Storage     ⚡ High Performance
```

**Key Dependencies:**

```
Django==5.2.1
djangorestframework==3.16.0
django-cors-headers==4.7.0
django-allauth==65.9.0
pillow==11.2.1
psycopg2-binary==2.9.10
gunicorn==21.2.0
```

### 🎨 Frontend

```
⚛️ React 19.1.0         📘 TypeScript 5.8.3        ⚡ Vite 6.3.5
🎨 Tailwind CSS 4.1.8   ✨ Framer Motion           💎 Liquid Glass UI
📱 Mobile-First         🔄 Real-time Updates        🎯 Context State Mgmt
```

**Key Dependencies:**

```
react==19.1.0
typescript==5.8.3
vite==6.3.5
tailwindcss==4.1.8
framer-motion==12.18.1
react-router-dom==7.6.1
```

## 📁 Project Structure

```
s25-project-black/
├── backend/                 # Django REST API
│   ├── app/                 # Main Django application
│   │   ├── models/          # Database models
│   │   ├── views/           # API endpoints
│   │   ├── serializers/     # Data serialization
│   │   ├── tests/           # Backend tests
│   │   └── utils/           # Utility functions
│   ├── project/             # Django settings
│   └── staticfiles/         # Collected static files
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript definitions
│   │   └── utils/           # Frontend utilities
│   └── dist/                # Production build
└── docs/                    # Project documentation
```

## 🚀 Key Features

### 🎨 Content Creation & Management

- ✨ Rich Posts with Markdown support
- 🖼️ Image uploads and storage
- 🏷️ Smart categories and organization
- 🔒 Granular privacy controls
- 📊 Trending content discovery
- 🔍 Advanced search capabilities

### 🤝 Social Interactions & Networking

- 👥 Follow system with status tracking
- 💝 Automatic friend detection
- 👍 Likes & threaded comments
- 🔔 Real-time notifications
- 📬 Federated inbox system
- 🎯 Personalized activity feeds

### 🌐 Federation & Cross-Instance

- 🔗 Node management and discovery
- 🌍 Cross-instance communication
- 📡 ActivityPub-compatible protocol
- 🚀 Push-based distribution
- 🔄 Remote following support
- 📨 Federated inbox delivery

### 💎 Modern UI/UX

- ✨ Liquid glass design (glassmorphism)
- 🌙 Dark/light mode support
- 📱 Fully responsive design
- 🎭 Smooth animations and transitions
- ⚡ Fast performance and optimization
- 🎯 Intuitive navigation

## 📊 Database Schema

### Core Models

- **Author**: User accounts with federation support (extends Django's AbstractUser)
- **Entry**: Posts/content with visibility controls and multiple content types
- **Follow**: Follow relationships with status tracking (pending/accepted/rejected)
- **Friendship**: Computed mutual follow relationships
- **Comment**: Threaded comments on posts
- **Like**: Like interactions for posts and comments
- **Inbox**: Activity notification system for federation
- **Node**: Remote federated instance management

### Key Relationships

- Authors can follow other authors (local or remote)
- Entries belong to authors and support various content types
- Comments are linked to entries and authors
- Likes can target both entries and comments
- Inbox stores activities for activity distribution
- Nodes manage federated instance connections

## 🚀 Quick Start

### 📋 Prerequisites

```
🐍 Python 3.11    📦 Node.js 18+    🗄️ PostgreSQL    📱 Git
```

### 🔧 Setup

```bash
# Clone repository
git clone <repository-url> && cd s25-project-black

# Backend Setup (Terminal 1)
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend Setup (Terminal 2)
cd frontend
npm install
npm run dev
```

**Access Points:**

- 🎨 Frontend: [http://localhost:5173](http://localhost:5173)
- 🔧 Backend API: [http://localhost:8000](http://localhost:8000)
- ⚙️ Admin Panel: [http://localhost:8000/admin](http://localhost:8000/admin)

## 🔧 Configuration

### Backend Environment Variables

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:pass@localhost/dbname
SITE_URL=http://localhost:8000
AUTO_APPROVE_NEW_USERS=True
```

### Frontend Environment Variables

```env
VITE_API_URL=http://localhost:8000
VITE_ENABLE_GITHUB_ACTIVITY=true
VITE_ENABLE_FEDERATION=true
```

## 📱 API Documentation

The backend provides a comprehensive REST API with the following key endpoints:

### Authentication

- `POST /api/auth/login/` - User login
- `POST /api/auth/signup/` - User registration
- `GET /api/auth/status/` - Check authentication status
- `POST /api/auth/logout/` - User logout

### Content Management

- `GET /api/entries/` - List posts with filtering
- `POST /api/entries/` - Create new post
- `GET /api/entries/{id}/` - Get specific post`
- `PATCH /api/entries/{id}/` - Update post
- `DELETE /api/entries/{id}/` - Delete post

### Social Features

- `GET /api/authors/` - List authors
- `POST /api/follows/` - Send follow request
- `POST /api/entries/{id}/likes/` - Like a post
- `POST /api/entries/{id}/comments/` - Comment on post

### Federation

- `POST /api/authors/{id}/inbox/` - Post to author's inbox
- `GET /api/nodes/` - List federated nodes
- `POST /api/nodes/add/` - Add new node

For complete API documentation, see [Backend API Documentation](docs/Backend-API.md).

## 🧪 Testing

### Backend Tests

```bash
cd backend
python manage.py test
```

### Frontend Tests

```bash
cd frontend
npm run test
npx playwright test  # E2E tests
```

## 🚀 Deployment

### Heroku Deployment

The project is configured for Heroku deployment with automatic frontend building.

```bash
# Build process (automated on Heroku)
npm run heroku-postbuild
```

### Production Setup

1. Set production environment variables
2. Configure PostgreSQL database
3. Set up static file serving
4. Configure CORS for your domain
5. Enable HTTPS
6. Set up monitoring and logging

## 🤝 Federation Protocol

This project implements a simplified ActivityPub-compatible federation protocol:

### Activity Types

- **Create** (entry): Distribute new posts to followers
- **Follow**: Send follow requests to remote authors
- **Like**: Share like activities across instances
- **Comment**: Federate comment activities

### Authentication

- HTTP Basic Authentication between nodes
- Node-specific credentials for cross-instance communication
- Session-based authentication for local users

### Object Identification

- Fully Qualified IDs (FQIDs) for cross-node references
- Format: `http://{host}/api/{resource_path}/{uuid}`

## 📚 Documentation & Resources

<div align="center">

|             **📖 Docs**              |                             **🎥 Media**                             |
| :----------------------------------: | :------------------------------------------------------------------: |
|  [Frontend Guide](docs/Frontend.md)  |        [Demo Video](https://youtube.com/watch?v=xrVt6h0fLqs)         |
| [API Reference](docs/Backend-API.md) | [Project Spec](https://uofa-cmput404.github.io/general/project.html) |

</div>

## 🚀 Ready to Join the Federation?

<div align="center">

**💫 Experience the future of social networking!**

[🎥 **Watch Demo**](https://youtube.com/watch?v=xrVt6h0fLqs) • [⚡ **Quick Start**](#-quick-start) • [📚 **Explore Docs**](docs/)

**Questions? Ideas? Contributions?**  
🐛 Open an Issue • 💡 Start a Discussion • 🤝 Fork & Contribute

---

### 🌟 **Built with passion by Team Black**

_Making social media truly social, one federation at a time_ 🌐✨

</div>
