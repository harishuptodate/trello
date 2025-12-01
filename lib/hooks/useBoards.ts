import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useOrganization } from '../organization-context';
import {
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query';
import type { Board, Column } from '@prisma/client';
import type { BoardWithColumns, ColumnWithTasks, TaskWithAssignees } from '../services';
import type { TaskData } from '@/components/board/task-form';

export type BoardType = Board & {
	createdBy: {
		id: string;
		name: string | null;
		email: string;
	};
};

const BOARD_STALE_TIME = 30_000;

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(options?.headers || {}),
		},
	});

	if (!response.ok) {
		try {
			const error = await response.json();
			throw new Error(error.error || error.details || 'Request failed');
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error('Request failed');
		}
	}

	return response.json();
}

function cloneColumns(columns: ColumnWithTasks[] = []) {
	return columns.map((column) => ({
		...column,
		tasks: [...column.tasks],
	}));
}

function reorderColumnsForMove(
	columns: ColumnWithTasks[],
	taskId: string,
	targetColumnId: string,
	targetIndex: number,
) {
	const updatedColumns = cloneColumns(columns);
	let taskToMove: TaskWithAssignees | undefined;

	for (const column of updatedColumns) {
		const idx = column.tasks.findIndex((task) => task.id === taskId);
		if (idx !== -1) {
			[taskToMove] = column.tasks.splice(idx, 1);
			break;
		}
	}

	const targetColumn = updatedColumns.find((col) => col.id === targetColumnId);
	if (!taskToMove || !targetColumn) {
		return columns;
	}

	targetColumn.tasks.splice(targetIndex, 0, {
		...taskToMove,
		columnId: targetColumnId,
	});

	return updatedColumns.map((column) => ({
		...column,
		tasks: column.tasks.map((task, index) => ({
			...task,
			sortOrder: index,
		})),
	}));
}

export function useBoards(organizationId?: string | null) {
	const { data: session } = useSession();
	const { selectedOrgId } = useOrganization();
	const orgId = organizationId || selectedOrgId;
	const queryClient = useQueryClient();

	const boardsQuery = useQuery<BoardType[]>({
		queryKey: ['boards', orgId],
		queryFn: () =>
			fetchJson<BoardType[]>(`/api/boards?organizationId=${orgId}`),
		enabled: !!orgId && !!session?.user,
		staleTime: BOARD_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const createBoardMutation = useMutation({
		mutationFn: async (boardData: {
			title: string;
			description?: string;
			color?: string;
			createDefaultColumns?: boolean;
		}) => {
			if (!orgId || !session?.user) {
				throw new Error('User not authenticated');
			}

			return fetchJson<BoardType>('/api/boards', {
				method: 'POST',
				body: JSON.stringify({
					...boardData,
					organizationId: orgId,
				}),
			});
		},
		onSuccess: (newBoard) => {
			queryClient.setQueryData<BoardType[] | undefined>(
				['boards', orgId],
				(prev) => (prev ? [newBoard, ...prev] : [newBoard]),
			);
		},
	});

	const updateBoardMutation = useMutation({
		mutationFn: async ({
			boardId,
			updates,
		}: {
			boardId: string;
			updates: Partial<Board>;
		}) =>
			fetchJson<BoardType>(`/api/boards/${boardId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			}),
		onSuccess: (updatedBoard) => {
			queryClient.setQueryData<BoardType[] | undefined>(
				['boards', orgId],
				(prev) =>
					prev?.map((board) =>
						board.id === updatedBoard.id ? updatedBoard : board,
					) ?? prev,
			);
		},
	});

	const deleteBoardMutation = useMutation({
		mutationFn: (boardId: string) =>
			fetchJson(`/api/boards/${boardId}`, { method: 'DELETE' }),
		onSuccess: (_, boardId) => {
			queryClient.setQueryData<BoardType[] | undefined>(
				['boards', orgId],
				(prev) => prev?.filter((board) => board.id !== boardId) ?? prev,
			);
		},
	});

	return {
		boards: boardsQuery.data ?? [],
		loading: boardsQuery.isPending,
		error: boardsQuery.error
			? boardsQuery.error instanceof Error
				? boardsQuery.error.message
				: 'Failed to load boards.'
			: null,
		createBoard: useCallback(
			(boardData: {
				title: string;
				description?: string;
				color?: string;
				createDefaultColumns?: boolean;
			}) => createBoardMutation.mutateAsync(boardData),
			[createBoardMutation],
		),
		updateBoard: useCallback(
			(boardId: string, updates: Partial<Board>) =>
				updateBoardMutation.mutateAsync({ boardId, updates }),
			[updateBoardMutation],
		),
		deleteBoard: useCallback(
			(boardId: string) => deleteBoardMutation.mutateAsync(boardId),
			[deleteBoardMutation],
		),
		refetch: boardsQuery.refetch,
	};
}

export function useBoard(boardId: string) {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const boardQueryKey = useMemo(() => ['board', boardId], [boardId]);

	const boardQuery = useQuery<BoardWithColumns>({
		queryKey: boardQueryKey,
		queryFn: () => fetchJson<BoardWithColumns>(`/api/boards/${boardId}/full`),
		enabled: Boolean(boardId && session?.user),
		staleTime: BOARD_STALE_TIME,
		refetchOnWindowFocus: false,
	});

	const board = boardQuery.data ?? null;
	const columns = useMemo<ColumnWithTasks[]>(
		() => board?.columns ?? [],
		[board?.columns],
	);

	const setColumns = useCallback(
		(
			updater:
				| ColumnWithTasks[]
				| ((prevColumns: ColumnWithTasks[]) => ColumnWithTasks[]),
		) => {
			queryClient.setQueryData<BoardWithColumns | undefined>(
				boardQueryKey,
				(prev) => {
					if (!prev) return prev;
					const currentColumns = cloneColumns(
						(prev.columns || []) as ColumnWithTasks[],
					);
					const nextColumns =
						typeof updater === 'function'
							? (updater as (prev: ColumnWithTasks[]) => ColumnWithTasks[])(
									currentColumns,
							  )
							: updater;

					return { ...prev, columns: nextColumns };
				},
			);
		},
		[boardQueryKey, queryClient],
	);

	const updateBoardMutation = useMutation({
		mutationFn: async ({
			boardId,
			updates,
		}: {
			boardId: string;
			updates: Partial<Board>;
		}) =>
			fetchJson<BoardWithColumns>(`/api/boards/${boardId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			}),
		onSuccess: (updatedBoard) => {
			queryClient.setQueryData<BoardWithColumns | undefined>(
				boardQueryKey,
				(prev) => (prev ? { ...prev, ...updatedBoard } : prev),
			);
		},
	});

	const createTaskMutation = useMutation({
		mutationFn: async ({
			columnId,
			taskData,
		}: {
			columnId: string;
			taskData: TaskData;
		}) =>
			fetchJson<TaskWithAssignees>('/api/tasks', {
				method: 'POST',
				body: JSON.stringify({
					...taskData,
					columnId,
					priority: taskData.priority?.toUpperCase() || 'MEDIUM',
					sortOrder:
						columns.find((col) => col.id === columnId)?.tasks.length || 0,
				}),
			}),
	});

	const moveTaskMutation = useMutation({
		mutationFn: ({
			taskId,
			newColumnId,
			newSortOrder,
		}: {
			taskId: string;
			newColumnId: string;
			newSortOrder: number;
		}) =>
			fetchJson(`/api/tasks/${taskId}/move`, {
				method: 'PUT',
				body: JSON.stringify({ newColumnId, newSortOrder }),
			}),
	});

	const createColumnMutation = useMutation({
		mutationFn: (columnData: { title: string; sortOrder: number }) =>
			fetchJson<Column>(`/api/columns`, {
				method: 'POST',
				body: JSON.stringify({
					...columnData,
					boardId,
				}),
			}),
	});

	const updateColumnMutation = useMutation({
		mutationFn: ({ columnId, title }: { columnId: string; title: string }) =>
			fetchJson<Column>(`/api/columns/${columnId}`, {
				method: 'PUT',
				body: JSON.stringify({ title }),
			}),
	});

	const updateTaskMutation = useMutation({
		mutationFn: ({
			taskId,
			updates,
		}: {
			taskId: string;
			updates: Partial<TaskWithAssignees>;
		}) =>
			fetchJson<TaskWithAssignees>(`/api/tasks/${taskId}`, {
				method: 'PUT',
				body: JSON.stringify(updates),
			}),
	});

	const deleteColumnMutation = useMutation({
		mutationFn: (columnId: string) =>
			fetchJson(`/api/columns/${columnId}`, { method: 'DELETE' }),
	});

	const updateBoard = useCallback(
		(targetBoardId: string, updates: Partial<Board>) =>
			updateBoardMutation.mutateAsync({ boardId: targetBoardId, updates }),
		[updateBoardMutation],
	);

	const createRealTask = useCallback(
		async (columnId: string, taskData: TaskData) => {
			const previousBoard = queryClient.getQueryData<BoardWithColumns | undefined>(
				boardQueryKey,
			);
			const targetSort =
				previousBoard?.columns.find((col) => col.id === columnId)?.tasks.length ??
				0;
			const tempId = `temp-task-${Date.now()}`;
			const now = new Date();
			const optimisticTask: TaskWithAssignees = {
				id: tempId,
				title: taskData.title,
				description: taskData.description ?? null,
				dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
				priority: (taskData.priority ?? 'medium').toUpperCase() as
					| 'LOW'
					| 'MEDIUM'
					| 'HIGH',
				checklist: taskData.checklist ?? null,
				sortOrder: targetSort,
				columnId,
				createdAt: now,
				assignees: [],
				comments: [],
			};

			setColumns((prevColumns) =>
				prevColumns.map((col) =>
					col.id === columnId
						? { ...col, tasks: [...col.tasks, optimisticTask] }
						: col,
				),
			);

			try {
				const createdTask = await createTaskMutation.mutateAsync({
					columnId,
					taskData,
				});

				setColumns((prevColumns) =>
					prevColumns.map((col) =>
						col.id === columnId
							? {
									...col,
									tasks: col.tasks.map((task) =>
										task.id === tempId ? createdTask : task,
									),
							  }
							: col,
					),
				);

				return createdTask;
			} catch (error) {
				if (previousBoard) {
					queryClient.setQueryData(boardQueryKey, previousBoard);
				}
				throw error;
			} finally {
				queryClient.invalidateQueries({ queryKey: boardQueryKey });
			}
		},
		[boardQueryKey, createTaskMutation, queryClient, setColumns],
	);

	const moveTask = useCallback(
		async (taskId: string, newColumnId: string, newSortOrder: number) => {
			const previousBoard = queryClient.getQueryData<BoardWithColumns | undefined>(
				boardQueryKey,
			);

			setColumns((prevColumns) =>
				reorderColumnsForMove(prevColumns, taskId, newColumnId, newSortOrder),
			);

			try {
				await moveTaskMutation.mutateAsync({
					taskId,
					newColumnId,
					newSortOrder,
				});
			} catch (error) {
				if (previousBoard) {
					queryClient.setQueryData(boardQueryKey, previousBoard);
				}
				throw error;
			} finally {
				queryClient.invalidateQueries({ queryKey: boardQueryKey });
			}
		},
		[boardQueryKey, moveTaskMutation, queryClient, setColumns],
	);

	const createRealColumn = useCallback(
		async (columnTitle: string) => {
			if (!boardId || !board) throw new Error('Board not loaded');
			const previousBoard =
				queryClient.getQueryData<BoardWithColumns | undefined>(boardQueryKey);
			const tempId = `temp-column-${Date.now()}`;
			const now = new Date();

			setColumns((prevColumns) => [
				...prevColumns,
				{
					id: tempId,
					title: columnTitle,
					sortOrder: prevColumns.length,
					boardId,
					createdAt: now,
					tasks: [],
				},
			]);

			try {
				const newColumn = await createColumnMutation.mutateAsync({
					title: columnTitle,
					sortOrder: columns.length,
				});

				setColumns((prevColumns) =>
					prevColumns.map((col) =>
						col.id === tempId ? { ...newColumn, tasks: [] } : col,
					),
				);
				return newColumn;
			} catch (error) {
				if (previousBoard) {
					queryClient.setQueryData(boardQueryKey, previousBoard);
				}
				throw error;
			} finally {
				queryClient.invalidateQueries({ queryKey: boardQueryKey });
			}
		},
		[
			boardId,
			board,
			boardQueryKey,
			columns.length,
			createColumnMutation,
			queryClient,
			setColumns,
		],
	);

	const updateRealColumn = useCallback(
		async (columnId: string, title: string) => {
			const previousBoard =
				queryClient.getQueryData<BoardWithColumns | undefined>(boardQueryKey);

			setColumns((prevColumns) =>
				prevColumns.map((col) => (col.id === columnId ? { ...col, title } : col)),
			);

			try {
				const updatedColumn = await updateColumnMutation.mutateAsync({
					columnId,
					title,
				});

				setColumns((prevColumns) =>
					prevColumns.map((col) =>
						col.id === columnId ? { ...col, ...updatedColumn } : col,
					),
				);
				return updatedColumn;
			} catch (error) {
				if (previousBoard) {
					queryClient.setQueryData(boardQueryKey, previousBoard);
				}
				throw error;
			} finally {
				queryClient.invalidateQueries({ queryKey: boardQueryKey });
			}
		},
		[boardQueryKey, queryClient, setColumns, updateColumnMutation],
	);

	const updateRealTask = useCallback(
		async (taskId: string, updates: Partial<TaskWithAssignees>) => {
			const previousBoard =
				queryClient.getQueryData<BoardWithColumns | undefined>(boardQueryKey);

			setColumns((prevColumns) =>
				prevColumns.map((col) => ({
					...col,
					tasks: col.tasks.map((task) =>
						task.id === taskId ? { ...task, ...updates } : task,
					),
				})),
			);

			try {
				const updatedTask = await updateTaskMutation.mutateAsync({
					taskId,
					updates,
				});

				setColumns((prevColumns) =>
					prevColumns.map((col) => ({
						...col,
						tasks: col.tasks.map((task) =>
							task.id === taskId ? updatedTask : task,
						),
					})),
				);

				return updatedTask;
			} catch (error) {
				if (previousBoard) {
					queryClient.setQueryData(boardQueryKey, previousBoard);
				}
				throw error;
			} finally {
				queryClient.invalidateQueries({ queryKey: boardQueryKey });
			}
		},
		[boardQueryKey, queryClient, setColumns, updateTaskMutation],
	);

	const deleteRealColumn = useCallback(
		async (columnId: string) => {
			const previousBoard =
				queryClient.getQueryData<BoardWithColumns | undefined>(boardQueryKey);

			setColumns((prevColumns) =>
				prevColumns.filter((column) => column.id !== columnId),
			);

			try {
				await deleteColumnMutation.mutateAsync(columnId);
			} catch (error) {
				if (previousBoard) {
					queryClient.setQueryData(boardQueryKey, previousBoard);
				}
				throw error;
			} finally {
				queryClient.invalidateQueries({ queryKey: boardQueryKey });
			}
		},
		[boardQueryKey, deleteColumnMutation, queryClient, setColumns],
	);

	return {
		board,
		columns,
		loading: boardQuery.isPending,
		error: boardQuery.error
			? boardQuery.error instanceof Error
				? boardQuery.error.message
				: 'Failed to load board.'
			: null,
		updateBoard,
		createRealTask,
		createRealColumn,
		setColumns,
		moveTask,
		updateRealColumn,
		updateRealTask,
		deleteRealColumn,
		refetch: boardQuery.refetch,
	};
}
