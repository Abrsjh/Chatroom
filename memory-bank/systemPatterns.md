# System Architecture Patterns

## Overall Architecture

### Frontend/Backend Separation
- **Frontend**: React SPA served statically from Vercel
- **Backend**: FastAPI REST API hosted on Render
- **Database**: PostgreSQL on Render with connection pooling
- **Communication**: HTTP/HTTPS requests with JSON payloads

### API Layer Design

#### REST Conventions
- **GET** `/api/channels` - List all public channels
- **POST** `/api/channels` - Create new channel
- **GET** `/api/channels/{id}/posts` - Get posts in channel
- **POST** `/api/channels/{id}/posts` - Create post in channel
- **GET** `/api/posts/{id}/replies` - Get replies to post
- **POST** `/api/posts/{id}/replies` - Reply to post
- **PUT** `/api/posts/{id}/vote` - Vote on post
- **GET** `/api/messages` - Get DMs for user
- **POST** `/api/messages` - Send DM

#### Response Format
```json
{
  "data": { /* actual response data */ },
  "success": true,
  "message": "Operation successful",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Error Handling
```json
{
  "error": { 
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": { /* field-specific errors */ }
  },
  "success": false,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Component-Driven Frontend

#### Component Hierarchy
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── Main
├── Pages
│   ├── ChannelList
│   ├── ChannelView
│   ├── PostView
│   └── DirectMessages
└── Components
    ├── Post
    ├── Reply
    ├── VoteButton
    └── MessageList
```

#### State Management (Zustand)
- **Auth Store**: User authentication state
- **Channel Store**: Channel list and current channel
- **Post Store**: Posts and replies data
- **Message Store**: DM conversations
- **UI Store**: Modal states, loading states

### Authentication Flow

#### JWT Token Strategy
1. User login → Backend validates → Returns JWT
2. Frontend stores JWT in localStorage
3. All API requests include Authorization header
4. Backend validates JWT on protected routes
5. Token refresh before expiration

#### Route Protection
- **Public**: Landing page, login, register
- **Protected**: All channels, posts, DMs
- **Admin**: Moderation tools

### Database Schema Patterns

#### Core Entities
- **Users**: id, username, email, password_hash, created_at
- **Channels**: id, name, description, created_by, created_at
- **Posts**: id, channel_id, user_id, content, created_at, updated_at
- **Replies**: id, post_id, user_id, content, created_at
- **Votes**: id, post_id, user_id, vote_type, created_at
- **Messages**: id, sender_id, recipient_id, content, created_at

#### Relationships
- One-to-many: User → Posts, Channel → Posts, Post → Replies
- Many-to-many: User ↔ Votes (through vote_type)
- One-to-one: Message → Sender/Recipient

### Real-Time Messaging Strategy

#### Phase 1: HTTP Polling
- Client polls `/api/messages/updates` every 5 seconds
- Returns new messages since last poll
- Simple to implement, works with existing infrastructure

#### Phase 2: WebSocket Upgrade
- WebSocket connection for real-time events
- Event types: new_message, post_created, vote_updated
- Fallback to polling if WebSocket unavailable

### Security Patterns

#### Input Validation
- Pydantic models for all API inputs
- SQL injection prevention via SQLAlchemy
- XSS protection via content sanitization
- CSRF protection via token validation

#### Data Protection
- Password hashing with bcrypt
- JWT secrets in environment variables
- Rate limiting on authentication endpoints
- HTTPS enforcement in production