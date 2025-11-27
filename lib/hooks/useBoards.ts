import { useCallback, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useOrganization } from '../organization-context';
import type { Board, Column, Task } from '@prisma/client';
import type { ColumnWithTasks, BoardWithColumns } from '../services';
import type { TaskData } from '@/app/boards/[id]/page';
import type { TaskWithAssignees } from '../services';

export type BoardType = Board & {
	createdBy: {
		id: string;
		name: string | null;
		email: string;
	};
};

export function useBoards(organizationId?: string | null) {
	const { data: session } = useSession();
	const { selectedOrgId } = useOrganization();
	const orgId = organizationId || selectedOrgId;

	const [boards, setBoards] = useState<BoardType[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const cacheRef = useRef<{
		orgId: string | null;
		data: BoardType[];
		timestamp: number;
	} | null>(null);
	const CACHE_DURATION = 30000; // 30 seconds

	const loadBoards = useCallback(async () => {
		if (!orgId || !session?.user) {
			setBoards([]);
			setLoading(false);
			return;
		}

		// Check cache
		if (
			cacheRef.current &&
			cacheRef.current.orgId === orgId &&
			Date.now() - cacheRef.current.timestamp < CACHE_DURATION
		) {
			setBoards(cacheRef.current.data);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`/api/boards?organizationId=${orgId}`);
			if (!response.ok) throw new Error('Failed to load boards');
			const data = await response.json();
			setBoards(data);
			// Update cache
			cacheRef.current = { orgId, data, timestamp: Date.now() };
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load boards.');
			setBoards([]);
		} finally {
			setLoading(false);
		}
	}, [orgId, session]);

	useEffect(() => {
		if (orgId && session?.user) {
			loadBoards();
		} else if (!orgId && session?.user) {
			// User is authenticated but no org selected
			setBoards([]);
			setLoading(false);
		}
	}, [orgId, session, loadBoards]);

	async function createBoard(boardData: {
		title: string;
		description?: string;
		color?: string;
		createDefaultColumns?: boolean;
	}) {
		if (!orgId || !session?.user) throw new Error('User not authenticated');

		try {
			const response = await fetch('/api/boards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...boardData,
					organizationId: orgId,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to create board');
			}

			const newBoard = await response.json();
			setBoards((prev) => [newBoard, ...prev]);
			// Invalidate cache
			if (cacheRef.current?.orgId === orgId) {
				cacheRef.current = null;
			}
			return newBoard;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create board');
			throw err;
		}
	}

	async function updateBoard(boardId: string, updates: Partial<Board>) {
		try {
			const response = await fetch(`/api/boards/${boardId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) throw new Error('Failed to update board');

			const updatedBoard = await response.json();
			setBoards((prev) =>
				prev.map((board) => (board.id === boardId ? updatedBoard : board)),
			);
			// Invalidate cache
			if (cacheRef.current?.orgId === orgId) {
				cacheRef.current = null;
			}
			return updatedBoard;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update board');
			throw err;
		}
	}

	async function deleteBoard(boardId: string) {
		try {
			const response = await fetch(`/api/boards/${boardId}`, {
				method: 'DELETE',
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error('Failed to delete board' + (error.details || ''));
			}

			setBoards((prev) => prev.filter((board) => board.id !== boardId));
			// Invalidate cache
			if (cacheRef.current?.orgId === orgId) {
				cacheRef.current = null;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete board');
			throw err;
		}
	}

	return {
		boards,
		loading,
		error,
		createBoard,
		updateBoard,
		deleteBoard,
		refetch: loadBoards,
	};
}

export function useBoard(boardId: string) {
	const { data: session } = useSession();
	const [board, setBoard] = useState<BoardWithColumns | null>(null);
	const [columns, setColumns] = useState<ColumnWithTasks[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const boardCacheRef = useRef<{
		boardId: string;
		data: BoardWithColumns;
		timestamp: number;
	} | null>(null);
	const BOARD_CACHE_DURATION = 30000; // 30 seconds

	const loadBoard = useCallback(async () => {
		if (!boardId) return;

		// Check cache
		if (
			boardCacheRef.current &&
			boardCacheRef.current.boardId === boardId &&
			Date.now() - boardCacheRef.current.timestamp < BOARD_CACHE_DURATION
		) {
			const cachedData = boardCacheRef.current.data;
			setBoard(cachedData);
			setColumns((cachedData.columns || []) as ColumnWithTasks[]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`/api/boards/${boardId}/full`);
			if (!response.ok) throw new Error('Failed to load board');

			const fullBoard = await response.json();
			setBoard(fullBoard);
			setColumns((fullBoard.columns || []) as ColumnWithTasks[]);
			// Update cache
			boardCacheRef.current = {
				boardId,
				data: fullBoard,
				timestamp: Date.now(),
			};
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load board.');
		} finally {
			setLoading(false);
		}
	}, [boardId]);

	useEffect(() => {
		if (boardId && session?.user) {
			loadBoard();
		}
	}, [boardId, session, loadBoard]);

	async function updateBoard(boardId: string, updates: Partial<Board>) {
		try {
			const response = await fetch(`/api/boards/${boardId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) throw new Error('Failed to update board');

			const updatedBoard = await response.json();
			setBoard((prev) => (prev ? { ...prev, ...updatedBoard } : null));
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
			return updatedBoard;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to update the board.',
			);
			throw err;
		}
	}

	async function createRealTask(columnId: string, taskData: TaskData) {
		try {
			const response = await fetch('/api/tasks', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...taskData,
					columnId,
					priority: taskData.priority?.toUpperCase() || 'MEDIUM',
					sortOrder:
						columns.find((col) => col.id === columnId)?.tasks.length || 0,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.details || 'Failed to create task');
			}

			const newTask = await response.json();
			setColumns((prev) =>
				prev.map((col) =>
					col.id === columnId
						? { ...col, tasks: [...col.tasks, newTask] }
						: col,
				),
			);
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
			return newTask;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create task.');
			throw err;
		}
	}

	async function moveTask(
		taskId: string,
		newColumnId: string,
		newSortOrder: number,
	) {
		try {
			const response = await fetch(`/api/tasks/${taskId}/move`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newColumnId, newSortOrder }),
			});

			if (!response.ok) throw new Error('Failed to move task');

			setColumns((prev) => {
				const newColumns = [...prev];
				let taskToMove: Task | null = null;

				for (const col of newColumns) {
					const taskIndex = col.tasks.findIndex((task) => task.id === taskId);
					if (taskIndex !== -1) {
						taskToMove = col.tasks[taskIndex];
						col.tasks.splice(taskIndex, 1);
						break;
					}
				}

				if (taskToMove) {
					const targetColumn = newColumns.find((col) => col.id === newColumnId);
					if (targetColumn) {
						targetColumn.tasks.splice(
							newSortOrder,
							0,
							taskToMove as unknown as Task & {
								assignees: {
									id: string;
									name: string | null;
									email: string;
									image: string | null;
								}[];
							},
						);
					}
				}

				return newColumns;
			});
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to move task.');
			throw err;
		}
	}

	async function createRealColumn(columnTitle: string) {
		if (!boardId || !board) throw new Error('Board not loaded');
		try {
			const response = await fetch('/api/columns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: columnTitle,
					sortOrder: columns.length,
					boardId: boardId,
				}),
			});

			if (!response.ok) throw new Error('Failed to create column');

			const newColumn = await response.json();
			setColumns((prev) => [...prev, { ...newColumn, tasks: [] }]);
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
			return newColumn;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create column.');
			throw err;
		}
	}

	async function updateRealColumn(columnId: string, title: string) {
		try {
			const response = await fetch(`/api/columns/${columnId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title }),
			});

			if (!response.ok) throw new Error('Failed to update column');

			const updatedColumn = await response.json();
			setColumns((prev) =>
				prev.map((col) =>
					col.id === columnId ? { ...col, ...updatedColumn } : col,
				),
			);
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
			return updatedColumn;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update column.');
			throw err;
		}
	}

	async function updateRealTask(
		taskId: string,
		updates: Partial<TaskWithAssignees>,
	) {
		try {
			const response = await fetch(`/api/tasks/${taskId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});

			if (!response.ok) throw new Error('Failed to update task');

			const updatedTask = await response.json();
			setColumns((prev) =>
				prev.map((col) => ({
					...col,
					tasks: col.tasks.map((task) =>
						task.id === taskId ? updatedTask : task,
					),
				})),
			);
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
			return updatedTask;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update task.');
			throw err;
		}
	}

	async function deleteRealColumn(columnId: string) {
		try {
			const response = await fetch(`/api/columns/${columnId}`, {
				method: 'DELETE',
			});

			if (!response.ok) throw new Error('Failed to delete column');

			setColumns((prev) => prev.filter((col) => col.id !== columnId));
			// Invalidate cache
			if (boardCacheRef.current?.boardId === boardId) {
				boardCacheRef.current = null;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete column.');
			throw err;
		}
	}

	return {
		board,
		columns,
		loading,
		error,
		updateBoard,
		createRealTask,
		createRealColumn,
		setColumns,
		moveTask,
		updateRealColumn,
		updateRealTask,
		deleteRealColumn,
		refetch: loadBoard,
	};
}
