import { useCallback, useEffect, useState } from 'react';
import {
	boardDataService,
	boardService,
	columnService,
	taskService,
} from '../services';
import { useUser } from '@clerk/nextjs';
import { Board, Column, ColumnWithTasks, Task } from '../supabase/models';
import { useSupabase } from '../supabase/SupabaseProvider';
import { TaskData } from '@/app/boards/[id]/page';

export function useBoards() {
	const { user } = useUser();
	const { supabase } = useSupabase();
	const [boards, setBoards] = useState<Board[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (user) {
			loadBoards();
		}
	}, [user, supabase]);

	const loadBoards = useCallback(async () => {
		if (!user) return;
		try {
			setLoading(true);
			setError(null);
			const data = await boardService.getBoards(supabase!, user.id);
			setBoards(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create board.');
		} finally {
			setLoading(false);
		}
	}, [user, supabase]);

	useEffect(() => {
		if (user) {
			loadBoards();
		}
	}, [user, loadBoards]);

	async function createBoard(boardData: {
		title: string;
		description?: string;
		color?: string;
		createDefaultColumns?: boolean;
	}) {
		if (!user) throw new Error('User not authenticated');
		try {
			const newBoard = await boardDataService.createBoardWithDefaultColumns(
				supabase!,
				{ ...boardData, userId: user.id },
			);
			setBoards((prev) => [newBoard, ...prev]);
			console.log('Board created:', newBoard);
			return newBoard;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create board');
		}
	}

	async function updateBoard(boardId: string, updates: Partial<Board>) {
		try {
			const updatedBoard = await boardService.updateBoard(
				supabase!,
				boardId,
				updates,
			);
			setBoards((prev) =>
				prev.map((board) => (board.id === boardId ? updatedBoard : board)),
			);
			return updatedBoard;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update board');
		}
	}

	async function deleteBoard(boardId: string) {
		try {
			await boardService.deleteBoard(supabase!, boardId);
			setBoards((prev) => prev.filter((board) => board.id !== boardId));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete board');
		}
	}

	return { boards, loading, error, createBoard, updateBoard, deleteBoard };
}

export function useBoard(boardId: string) {
	const { user } = useUser();
	const { supabase } = useSupabase();
	const [board, setBoard] = useState<Board | null>(null);
	const [columns, setColumns] = useState<ColumnWithTasks[]>([]);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (boardId) {
			loadBoard();
		}
	}, [boardId, supabase]);

	async function loadBoard() {
		if (!boardId) return;
		try {
			setLoading(true);
			setError(null);
			const data = await boardDataService.getBoardWithColumns(
				supabase!,
				boardId,
			);
			setBoard(data.board);
			setColumns(data.columnsWithTasks);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create board.');
		} finally {
			setLoading(false);
		}
	}

	async function updateBoard(boardId: string, updates: Partial<Board>) {
		try {
			const updatedBoard = await boardService.updateBoard(
				supabase!,
				boardId,
				updates,
			);
			setBoard(updatedBoard);
			return updatedBoard;
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to update the board.',
			);
		}
	}
	async function createRealTask(columnId: string, taskData: TaskData) {
		try {
			const newTask = await taskService.createTask(supabase!, {
				title: taskData.title,
				description: taskData.description ?? null,
				assignee: taskData.assignee ?? null,
				due_date: taskData.dueDate ?? null,
				column_id: columnId,
				priority: taskData.priority ?? 'medium',
				sort_order:
					columns.find((col) => col.id === columnId)?.tasks.length || 0, // why + 1 ? // ans: because the sort_order is the index of the column in the columns array, cant we do tasks.length || 0 ? // ans: because the tasks.length is the number of tasks in the column, not the sort_order
				checklist: taskData.checklist || null,
			} as Omit<Task, 'id' | 'created_at' | 'updated_at'>);

			setColumns((prev) =>
				prev.map((col) =>
					col.id === columnId
						? { ...col, tasks: [...col.tasks, newTask] }
						: col,
				),
			);

			return newTask;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create task.');
		}
	}

	async function moveTask(
		taskId: string,
		newColumnId: string,
		newSortOrder: number,
	) {
		try {
			await taskService.moveTask(supabase!, taskId, newColumnId, newSortOrder);

			setColumns((prev) => {
				const newColumns = [...prev];

				// Find and remove task from the old column
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
					// Add task to new column
					const targetColumn = newColumns.find((col) => col.id === newColumnId);
					if (targetColumn) {
						targetColumn.tasks.splice(newSortOrder, 0, taskToMove);
					}
				}

				return newColumns;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to move task.');
		}
	}
	async function createRealColumn(columnTitle: string) {
		if (!boardId || !board) throw new Error('Board not loaded');
		try {
			const newColumn = await columnService.createColumn(supabase!, {
				title: columnTitle,
				sort_order: columns.length,
				board_id: boardId,
				user_id: board?.user_id ?? '',
			});
			setColumns((prev) => [...prev, { ...newColumn, tasks: [] }]);
			return newColumn;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create column.');
		} finally {
			setLoading(false);
		}
	}
	async function updateRealColumn(columnId: string, title: string) {
		try {
			const updatedColumn = await columnService.updateColumnTitle(
				supabase!,
				columnId,
				title,
			);
			setColumns((prev) =>
				prev.map((col) =>
					col.id === columnId ? { ...col, ...updatedColumn } : col,
				),
			);
			return updatedColumn;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update column.');
		}
	}

	async function updateRealTask(taskId: string, updates: Partial<Task>) {
		try {
			const updatedTask = await taskService.updateTask(
				supabase!,
				taskId,
				updates,
			);
			setColumns((prev) =>
				prev.map((col) => ({
					...col,
					tasks: col.tasks.map((task) =>
						task.id === taskId ? updatedTask : task,
					),
				})),
			);
			return updatedTask;
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update task.');
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
	};
}
