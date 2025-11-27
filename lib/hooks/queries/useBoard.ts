import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { BoardWithColumns, ColumnWithTasks, TaskWithAssignees } from '@/lib/services';
import type { Task } from '@prisma/client';

const boardKey = (boardId: string) => ['board', boardId] as const;

export function useBoard(boardId: string) {
	return useQuery({
		enabled: !!boardId,
		queryKey: boardKey(boardId),
		queryFn: async () => {
			const res = await fetch(`/api/boards/${boardId}/full`);
			if (!res.ok) throw new Error('Failed to load board');
			return (await res.json()) as BoardWithColumns;
		},
		staleTime: 30_000,
	});
}

export function useCreateTask(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			columnId: string;
			task: {
				title: string;
				description?: string;
				assigneeIds?: string[];
				dueDate?: string;
				priority: 'low' | 'medium' | 'high';
				checklist?: any;
			};
		}) => {
			const res = await fetch('/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...payload.task,
					priority: payload.task.priority?.toUpperCase(),
					columnId: payload.columnId,
					sortOrder: 0,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create task');
			}
			return (await res.json()) as TaskWithAssignees;
		},
		onMutate: async ({ columnId, task }) => {
			await queryClient.cancelQueries({ queryKey: boardKey(boardId) });
			const previous = queryClient.getQueryData<BoardWithColumns>(boardKey(boardId));
			if (previous) {
				const optimisticTask: TaskWithAssignees = {
					id: `optimistic-${Date.now()}`,
					title: task.title,
					description: task.description ?? null,
					priority: (task.priority ?? 'medium').toUpperCase() as Task['priority'],
					checklist: task.checklist ?? null,
					sortOrder: previous.columns.find((c) => c.id === columnId)?.tasks.length || 0,
					columnId,
					dueDate: task.dueDate ? new Date(task.dueDate) : null,
					createdAt: new Date(),
					assignees: [],
					comments: [],
				} as TaskWithAssignees;
				queryClient.setQueryData<BoardWithColumns>(boardKey(boardId), {
					...previous,
					columns: previous.columns.map((col) =>
						col.id === columnId
							? { ...col, tasks: [...col.tasks, optimisticTask] }
							: col,
					),
				});
			}
			return { previous };
		},
		onError: (err, _vars, ctx) => {
			if (ctx?.previous) queryClient.setQueryData(boardKey(boardId), ctx.previous);
			toast.error((err as Error).message);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey(boardId) }),
	});
}

export function useUpdateTask(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			taskId,
			updates,
		}: {
			taskId: string;
			updates: Partial<Task> & { assigneeIds?: string[] };
		}) => {
			const res = await fetch(`/api/tasks/${taskId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});
			if (!res.ok) throw new Error('Failed to update task');
			return (await res.json()) as TaskWithAssignees;
		},
		onMutate: async ({ taskId, updates }) => {
			await queryClient.cancelQueries({ queryKey: boardKey(boardId) });
			const previous = queryClient.getQueryData<BoardWithColumns>(boardKey(boardId));
			if (previous) {
				queryClient.setQueryData<BoardWithColumns>(boardKey(boardId), {
					...previous,
					columns: previous.columns.map((col) => ({
						...col,
						tasks: col.tasks.map((task) =>
							task.id === taskId ? { ...task, ...updates } : task,
						),
					})),
				});
			}
			return { previous };
		},
		onError: (err, _vars, ctx) => {
			if (ctx?.previous) queryClient.setQueryData(boardKey(boardId), ctx.previous);
			toast.error((err as Error).message);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey(boardId) }),
	});
}

export function useDeleteTask(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (taskId: string) => {
			const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
			if (!res.ok) {
				throw new Error('Failed to delete task: You are not authorized to delete this board');
			}
			return taskId;
		},
		onMutate: async (taskId) => {
			await queryClient.cancelQueries({ queryKey: boardKey(boardId) });
			const previous = queryClient.getQueryData<BoardWithColumns>(boardKey(boardId));
			if (previous) {
				queryClient.setQueryData<BoardWithColumns>(boardKey(boardId), {
					...previous,
					columns: previous.columns.map((col) => ({
						...col,
						tasks: col.tasks.filter((task) => task.id !== taskId),
					})),
				});
			}
			return { previous };
		},
		onError: (err, _vars, ctx) => {
			if (ctx?.previous) queryClient.setQueryData(boardKey(boardId), ctx.previous);
			toast.error((err as Error).message);
		},
		onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey(boardId) }),
	});
}

export function useMoveTask(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			taskId: string;
			newColumnId: string;
			newSortOrder: number;
		}) => {
			const res = await fetch(`/api/tasks/${payload.taskId}/move`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					newColumnId: payload.newColumnId,
					newSortOrder: payload.newSortOrder,
				}),
			});
			if (!res.ok) throw new Error('Failed to move task');
			return payload;
		},
		onError: (err: Error) => toast.error(err.message),
		onSettled: () => queryClient.invalidateQueries({ queryKey: boardKey(boardId) }),
	});
}

export function useCreateColumn(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ title, sortOrder }: { title: string; sortOrder: number }) => {
			const res = await fetch('/api/columns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, sortOrder, boardId }),
			});
			if (!res.ok) throw new Error('Failed to create column');
			return (await res.json()) as ColumnWithTasks;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: boardKey(boardId) });
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useUpdateColumn(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			columnId,
			title,
		}: {
			columnId: string;
			title: string;
		}) => {
			const res = await fetch(`/api/columns/${columnId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title }),
			});
			if (!res.ok) throw new Error('Failed to update column');
			return (await res.json()) as ColumnWithTasks;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: boardKey(boardId),
			}),
		onError: (err: Error) => toast.error(err.message),
	});
}
