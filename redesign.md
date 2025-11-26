# Trello Redesign Implementation Plan

## Phase 1: Database Schema Modifications

### 1.1 Add BoardMember Model

- Create `BoardMember` model in `prisma/schema.prisma`:
- `id`, `boardId`, `userId`, `role` (enum: ADMIN, MEMBER), `createdAt`
- Relations: Board, User
- Unique constraint on `[boardId, userId]`
- Indexes on `boardId` and `userId`
- Add `members` relation to Board model
- Add `boardMemberships` relation to User model

### 1.2 Update Task Model for Multiple Assignees

- Remove `assigneeId` field from Task model
- Add `assignees` relation (many-to-many with User via implicit relation)
- Update User model to include `assignedTasks` relation

### 1.3 Add Comments to Task Model

- Create `TaskComment` model:
- `id`, `taskId`, `userId`, `content` (String), `createdAt`, `updatedAt`
- Relations: Task, User
- Indexes on `taskId` and `userId`
- Add `comments` relation to Task model
- Add `taskComments` relation to User model

### 1.4 Migration

- Generate migration: `npx prisma migrate dev --name add_board_members_multiple_assignees_comments`
- Update Prisma client

## Phase 2: Backend API Updates

### 2.1 Board Membership Service (`lib/services.ts`)

- Add `boardMemberService`:
- `addMember(boardId, userId, role?)` - auto-creates when user assigned to task
- `removeMember(boardId, userId)`
- `getBoardMembers(boardId)`
- `isBoardMember(userId, boardId)`
- `hasBoardAccess(userId, boardId)` - checks org membership OR board membership

### 2.2 Update Task Service

- Modify `createTask()` to accept `assigneeIds: string[]` instead of `assigneeId`
- Update `createTask()` to auto-add assignees as board members if not already members
- Modify `updateTask()` to handle `assigneeIds: string[]`
- Update `getTasksByBoardId()` and `getBoardWithColumns()` to include `assignees` array
- Update return types to include `assignees` array

### 2.3 Add Task Comment Service

- Add `taskCommentService`:
- `createComment(taskId, userId, content)`
- `updateComment(commentId, userId, content)` - only author can update
- `deleteComment(commentId, userId)` - only author or board admin
- `getTaskComments(taskId)`

### 2.4 Update Authorization (`lib/auth-rules.ts`)

- Add `hasBoardAccess(userId, boardId)` - checks org membership OR board membership
- Add `isBoardMember(userId, boardId)`
- Update all task/column API routes to use `hasBoardAccess()` instead of `hasOrgAccess()`
- Files to update:
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/api/tasks/[id]/move/route.ts`
- `app/api/columns/route.ts`
- `app/api/columns/[id]/route.ts`

### 2.5 Create Comment API Routes

- `app/api/tasks/[id]/comments/route.ts`:
- POST: Create comment (requires board membership)
- GET: List comments for task
- `app/api/tasks/[id]/comments/[commentId]/route.ts`:
- PUT: Update comment (author only)
- DELETE: Delete comment (author or board admin)

## Phase 3: TanStack Query Migration

### 3.1 Setup TanStack Query

- Install: `@tanstack/react-query`, `sonner` (toast)
- Create `lib/query-client.ts` - configure QueryClient with default options
- Update `components/providers.tsx` to wrap app with `QueryClientProvider`

### 3.2 Create Query Hooks (`lib/hooks/queries/`)

- `useBoards.ts` - replace `useBoards` hook:
- `useBoards(orgId)` - useQuery for fetching
- `useCreateBoard()` - useMutation with optimistic update
- `useUpdateBoard()` - useMutation with optimistic update
- `useDeleteBoard()` - useMutation with optimistic update
- `useBoard.ts` - replace `useBoard` hook:
- `useBoard(boardId)` - useQuery for fetching full board
- `useCreateTask()` - useMutation with optimistic update
- `useUpdateTask()` - useMutation with optimistic update
- `useDeleteTask()` - useMutation with optimistic update
- `useMoveTask()` - useMutation with optimistic update
- `useCreateColumn()` - useMutation with optimistic update
- `useUpdateColumn()` - useMutation with optimistic update
- `useOrganizations.ts`:
- `useOrganizations()` - useQuery
- `useCreateOrganization()` - useMutation
- `useUpdateOrganization()` - useMutation
- `useBoardMembers.ts`:
- `useBoardMembers(boardId)` - useQuery
- `useAddBoardMember()` - useMutation
- `useRemoveBoardMember()` - useMutation
- `useTaskComments.ts`:
- `useTaskComments(taskId)` - useQuery
- `useCreateComment()` - useMutation with optimistic update
- `useUpdateComment()` - useMutation
- `useDeleteComment()` - useMutation

### 3.3 Optimistic Updates Pattern

- Each mutation uses `onMutate` to update cache optimistically
- `onError` reverts cache using `queryClient.setQueryData()` and shows toast
- `onSuccess` invalidates related queries
- Toast messages via `sonner` for all errors

### 3.4 Update Components

- Replace all `useBoards()` and `useBoard()` calls in:
- `app/dashboard/page.tsx`
- `app/boards/[id]/page.tsx`
- `app/organizations/page.tsx`
- `app/organizations/[id]/page.tsx`
- Remove old hooks from `lib/hooks/useBoards.ts` (or keep for reference during migration)

## Phase 4: Multiple Assignees Implementation

### 4.1 Update Task Form Component (`app/boards/[id]/page.tsx`)

- Change `assigneeId` state to `assigneeIds: string[]`
- Replace Select dropdown with multi-select component (checkboxes or multi-select)
- Update form submission to send `assigneeIds` array
- Display multiple assignee avatars in task cards

### 4.2 Update Task Card Display

- Show multiple assignee avatars (max 3 visible, +N indicator)
- Update task detail view to show all assignees
- Update filter to support multiple assignees

### 4.3 Update API Request/Response Types

- Update `TaskData` type to use `assigneeIds?: string[]`
- Update all API route handlers to accept/return `assigneeIds`
- Update service layer types

## Phase 5: Comments Feature

### 5.1 Create Comment Components

- `components/task-comments.tsx`:
- Comment list with author, timestamp, content
- Add comment form
- Edit/delete actions (author only)
- Real-time updates via query invalidation

### 5.2 Integrate Comments into Task Dialog

- Add comments section to task detail dialog
- Position on right side (horizontal layout)
- Show comment count badge

## Phase 6: Task Dialog Redesign

### 6.1 Horizontal Layout (`app/boards/[id]/page.tsx`)

- Restructure TaskForm/TaskDialog to horizontal layout:
- Left side: Title, description, checklist, attachments
- Right side: Members (assignees), due date, priority, labels, comments
- Match Trello design from images:
- Header with column dropdown, action buttons
- Two-column layout (main content left, sidebar right)
- Comments panel on right side

### 6.2 Update Dialog Styling

- Increase dialog width (max-w-4xl or larger)
- Use grid layout for two columns
- Match spacing and typography from Trello

## Phase 7: Performance Optimizations

### 7.1 Component Memoization

- Wrap components with `React.memo()`:
- `DroppableColumn` (already memoized)
- `TaskCard` component
- `TaskForm` component
- `CommentItem` component
- Add proper dependency arrays to all `useCallback` and `useMemo`

### 7.2 Query Optimization

- Use `staleTime` and `cacheTime` appropriately
- Implement query prefetching for board data
- Use `keepPreviousData: true` for paginated queries
- Add `refetchOnWindowFocus: false` where appropriate

### 7.3 Render Optimization

- Split large components into smaller ones
- Use `useMemo` for filtered/sorted data
- Avoid unnecessary re-renders by checking data equality
- Update `organization-context.tsx` to prevent unnecessary re-renders

### 7.4 Code Splitting

- Lazy load task dialog component
- Lazy load comments component
- Use dynamic imports for heavy components

## Phase 8: Testing & Cleanup

### 8.1 Test Board Membership Flow

- Assign user to task → verify auto-added to board
- Test board member can edit/move tasks
- Test non-member cannot edit/move tasks
- Test org admin can still access all boards

### 8.2 Test Multiple Assignees

- Assign multiple users to task
- Verify all appear in UI
- Verify all are added as board members
- Test removing assignees

### 8.3 Test Comments

- Create, edit, delete comments
- Verify permissions (author only for edit/delete)
- Verify real-time updates

### 8.4 Test Optimistic Updates

- Verify UI updates immediately
- Test error scenarios (network failure)
- Verify rollback on error
- Verify toast notifications

### 8.5 Cleanup

- Remove old `useBoards.ts` hook if fully migrated
- Remove unused fetch calls
- Update TypeScript types
- Remove console.logs
- Update error handling

## Files to Modify

**Database:**

- `prisma/schema.prisma`

**Backend Services:**

- `lib/services.ts`
- `lib/auth-rules.ts`

**API Routes:**

- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `app/api/tasks/[id]/move/route.ts`
- `app/api/tasks/[id]/comments/route.ts` (new)
- `app/api/tasks/[id]/comments/[commentId]/route.ts` (new)
- `app/api/columns/route.ts`
- `app/api/columns/[id]/route.ts`

**Frontend Hooks:**

- `lib/hooks/queries/useBoards.ts` (new)
- `lib/hooks/queries/useBoard.ts` (new)
- `lib/hooks/queries/useOrganizations.ts` (new)
- `lib/hooks/queries/useBoardMembers.ts` (new)
- `lib/hooks/queries/useTaskComments.ts` (new)

**Components:**

- `components/providers.tsx`
- `components/task-comments.tsx` (new)
- `app/dashboard/page.tsx`
- `app/boards/[id]/page.tsx`
- `app/organizations/page.tsx`
- `app/organizations/[id]/page.tsx`

**Configuration:**

- `lib/query-client.ts` (new)
- `package.json` (add dependencies)