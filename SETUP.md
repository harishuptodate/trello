# Trello Clone - Setup Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase or standalone)
- GitHub OAuth App (optional, for GitHub login)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32

# GitHub OAuth (Optional)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Features Implemented

### Authentication

- ✅ Email/Password authentication
- ✅ GitHub OAuth authentication
- ✅ Session management with NextAuth.js
- ✅ Protected routes with middleware

### Organizations

- ✅ Create organizations
- ✅ View all user organizations
- ✅ Organization member management (admin only)
- ✅ Organization switching
- ✅ Role-based access control (ADMIN/MEMBER)

### Boards

- ✅ Create boards (admin only)
- ✅ View boards by organization
- ✅ Edit/Delete boards
- ✅ Board filtering and search

### Tasks

- ✅ Create tasks with assignees
- ✅ Assign tasks to organization members
- ✅ Drag and drop task management
- ✅ Task priorities and due dates
- ✅ Task checklists

### Authorization

- ✅ Only admins can create boards
- ✅ Only admins can add/remove organization members
- ✅ All members can view/edit boards in their organizations
- ✅ Task assignment restricted to organization members

## Database Schema

The application uses Prisma with the following main models:

- **User**: Authentication and user profiles
- **Organization**: Team workspaces
- **OrganizationMember**: User-organization relationships with roles
- **Board**: Project boards belonging to organizations
- **Column**: Board columns (e.g., To Do, In Progress)
- **Task**: Tasks with assignees, priorities, due dates, and checklists

## API Routes

### Authentication

- `POST /api/auth/signup` - User registration
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Organizations

- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get organization details
- `GET /api/organizations/[id]/members` - List organization members
- `POST /api/organizations/[id]/members` - Add member (admin only)
- `DELETE /api/organizations/[id]/members` - Remove member (admin only)

### Boards

- `GET /api/boards?organizationId=xxx` - List boards
- `POST /api/boards` - Create board (admin only)
- `GET /api/boards/[id]` - Get board
- `GET /api/boards/[id]/full` - Get board with columns and tasks
- `PUT /api/boards/[id]` - Update board
- `DELETE /api/boards/[id]` - Delete board

### Columns

- `POST /api/columns` - Create column
- `GET /api/columns/[id]` - Get column
- `PUT /api/columns/[id]` - Update column
- `DELETE /api/columns/[id]` - Delete column

### Tasks

- `POST /api/tasks` - Create task
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/tasks/[id]/move` - Move task to different column

## Getting Started

1. Sign up for a new account at `/auth/signup`
2. Create your first organization
3. You'll automatically be an admin of organizations you create
4. Add members to your organization (they must have accounts)
5. Create boards (admin only)
6. Start adding tasks and assigning them to team members

## Notes

- All users can belong to multiple organizations
- Only admins can create boards and manage members
- Task assignees must be members of the same organization
- Boards are scoped to organizations, not individual users
