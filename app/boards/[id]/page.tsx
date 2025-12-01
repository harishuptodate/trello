'use client';

import Navbar from '@/components/navbar';
import { BoardLoader } from '@/components/board/board-loader';
import { DroppableColumn } from '@/components/board/droppable-column';
import { SortableTask } from '@/components/board/sortable-task';
import { TaskOverlay } from '@/components/board/task-overlay';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TaskDialog, TaskDialogTask } from '@/components/task-dialog';
import { useBoard } from '@/lib/hooks/useBoards';
import type { Task } from '@prisma/client';
import type { ColumnWithTasks, TaskWithAssignees } from '@/lib/services';
import type { TaskData } from '@/components/board/task-form';
import { DialogTitle } from '@radix-ui/react-dialog';
import { Loader2, Plus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragOverlay,
	DragStartEvent,
	closestCenter,
	useSensor,
	PointerSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
export default function BoardPage() {
	const { id } = useParams<{ id: string }>();
	const {
		board,
		updateBoard,
		columns,
		createRealTask,
		createRealColumn,
		setColumns,
		moveTask,
		updateRealColumn,
		updateRealTask,
		deleteRealColumn,
		loading,
		error,
	} = useBoard(id);

	const handleTaskUpdated = useCallback(
		(taskId: string, updatedTask: TaskDialogTask) => {
			// Update columns state with the updated task
			setColumns((prev) =>
				prev.map((col) => ({
					...col,
					tasks: col.tasks.map((task) =>
						task.id === taskId
							? {
									...task,
									checklist: updatedTask.checklist,
							  }
							: task,
					),
				})),
			);
			// Update editingTask state if it's the same task
			setEditingTask((prev) =>
				prev?.id === taskId
					? ({
							...prev,
							checklist: updatedTask.checklist,
					  } as typeof prev)
					: prev,
			);
		},
		[setColumns],
	);

	// Ref to track latest columns state for drag handlers
	const columnsRef = useRef(columns);
	useEffect(() => {
		columnsRef.current = columns;
	}, [columns]);

	const [isEditngTitle, setIsEditingTitle] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newColor, setNewColor] = useState('');
	const [updatingBoardTitle, setUpdatingBoardTitle] = useState(false);

	const [activeTask, setActiveTask] = useState<TaskWithAssignees | null>(null);

	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [isCreatingColumn, setIsCreatingColumn] = useState(false);
	const [isEditingColumn, setIsEditingColumn] = useState(false);
	const [isEditingTask, setIsEditingTask] = useState(false);
	const dragOriginRef = useRef<{ columnId: string; index: number } | null>(null);
	const [editingTask, setEditingTask] = useState<
		| (Task & {
				assignee: {
					id: string;
					name: string | null;
					email: string;
					image: string | null;
				} | null;
		  })
		| null
	>(null);

	const [newColumnTitle, setNewColumnTitle] = useState('');
	const [editingColumnTitle, setEditingColumnTitle] = useState('');
	const [creatingColumn, setCreatingColumn] = useState(false);
	const [updatingColumn, setUpdatingColumn] = useState(false);
	const [inlineSavingColumnId, setInlineSavingColumnId] = useState<
		string | null
	>(null);

	const [editingColumn, setEditingColumn] = useState<ColumnWithTasks | null>(
		null,
	);
	const [filters, setFilters] = useState({
		priority: [] as string[],
		dueDate: null as string | null,
		assignee: [] as string[],
	});

	// Drag-to-scroll functionality
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [isDraggingScroll, setIsDraggingScroll] = useState(false);
	const [startX, setStartX] = useState(0);
	const [startY, setStartY] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [scrollTop, setScrollTop] = useState(0);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	// Memoize filter count
	const filterCount = useMemo(
		() =>
			Object.values(filters).reduce(
				(count, v) =>
					count + (Array.isArray(v) ? v.length : v !== null ? 1 : 0),
				0,
			),
		[filters],
	);

	const handleFilterChange = useCallback(
		(
			type: 'priority' | 'dueDate' | 'assignee',
			value: string | string[] | null,
		) => {
			setFilters((prev) => ({ ...prev, [type]: value }));
		},
		[],
	);

	const handleUpdateBoard = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!newTitle.trim() || !board || updatingBoardTitle) return;
			setUpdatingBoardTitle(true);
			try {
				await updateBoard(board.id, {
					title: newTitle.trim(),
					color: newColor || board.color,
				});
				setIsEditingTitle(false);
			} catch (error) {
				console.error('Error updating board:', error);
			} finally {
				setUpdatingBoardTitle(false);
			}
		},
		[board, newTitle, newColor, updateBoard, updatingBoardTitle],
	);

	const createTask = useCallback(
		async (columnId: string, taskData: TaskData) => {
			await createRealTask(columnId, taskData);
		},
		[createRealTask],
	);

	const handleCreateTask = useCallback(
		async (taskData: TaskData) => {
			try {
				// For the main "Add Task" button, use the first column as default
				const targetColumn = columns[0];
				if (!targetColumn) throw new Error('No columns found');
				await createTask(targetColumn.id, taskData);
				const trigger = document.querySelector(
					'[data-state="open"]',
				) as HTMLElement;
				if (trigger) trigger.click();
			} catch (error) {
				console.error('Error creating task:', error);
			}
		},
		[columns, createTask],
	);

	const handleEditTask = useCallback(
		(
			task: Task & {
				assignees?: {
					id: string;
					name: string | null;
					email: string;
					image: string | null;
				}[];
			},
		) => {
			// Get the latest task data from columns to ensure we have the most up-to-date data
			const latestTask = columns
				.flatMap((col) => col.tasks)
				.find((t) => t.id === task.id);
			const taskToEdit = latestTask || task;
			setEditingTask(
				taskToEdit as unknown as Task & {
					assignee: {
						id: string;
						name: string | null;
						email: string;
						image: string | null;
					} | null;
				},
			);
			setIsEditingTask(true);
		},
		[columns],
	);

	const [updatingTask, setUpdatingTask] = useState(false);

	const handleUpdateTask = useCallback(
		async (taskId: string, taskData: TaskData) => {
			if (!updateRealTask || updatingTask) return;
			setUpdatingTask(true);
			try {
				await updateRealTask(taskId, {
					title: taskData.title,
					description: taskData.description ?? null,
					assignees:
						taskData.assigneeIds?.map((id) => ({
							id,
							name: null,
							email: '',
							image: null,
						})) ?? [],
					dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
					priority: taskData.priority.toUpperCase() as
						| 'LOW'
						| 'MEDIUM'
						| 'HIGH',
					checklist: taskData.checklist || null,
				});
				setIsEditingTask(false);
				setEditingTask(null);
			} catch (error) {
				console.error('Error updating task:', error);
			} finally {
				setUpdatingTask(false);
			}
		},
		[updateRealTask, updatingTask],
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const taskId = event.active.id as string;
			const task = columns
				.flatMap((col) => col.tasks)
				.find((task) => task.id === taskId);

			if (task) {
				setActiveTask(task as TaskWithAssignees);
			}
			const originColumn = columns.find((col) =>
				col.tasks.some((t) => t.id === taskId),
			);
			if (originColumn) {
				dragOriginRef.current = {
					columnId: originColumn.id,
					index: originColumn.tasks.findIndex((t) => t.id === taskId),
				};
			}
		},
		[columns],
	);

	const handleDragOver = useCallback(
		(event: DragOverEvent) => {
			const { active, over } = event;
			if (!over) return;

			const activeId = active.id as string;
			const overId = over.id as string;

			const sourceColumn = columns.find((col) =>
				col.tasks.some((task) => task.id === activeId),
			);

			const targetColumn = columns.find((col) =>
				col.tasks.some((task) => task.id === overId),
			);

			if (!sourceColumn || !targetColumn) return;

			if (sourceColumn.id === targetColumn.id) {
				const activeIndex = sourceColumn.tasks.findIndex(
					(task) => task.id === activeId,
				);

				const overIndex = targetColumn.tasks.findIndex(
					(task) => task.id === overId,
				);

				if (activeIndex !== overIndex) {
					setColumns((prev: ColumnWithTasks[]) => {
						const newColumns = [...prev];
						const column = newColumns.find((col) => col.id === sourceColumn.id);
						if (column) {
							const tasks = [...column.tasks];
							const [removed] = tasks.splice(activeIndex, 1);
							tasks.splice(overIndex, 0, removed);
							column.tasks = tasks;
						}
						return newColumns;
					});
				}
			}
		},
		[columns, setColumns],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over) {
				setActiveTask(null);
				dragOriginRef.current = null;
				return;
			}

			const taskId = active.id as string;
			const overId = over.id as string;

			setActiveTask(null);

			// Use ref to get the latest columns state (includes handleDragOver's optimistic updates)
			const currentColumns = columnsRef.current;
			const origin = dragOriginRef.current;
			dragOriginRef.current = null;

			// Check if dropping on a column (column ID matches overId)
			const targetColumn = currentColumns.find((col) => col.id === overId);
			if (targetColumn) {
				// Dropping directly on a column
				const sourceColumn = currentColumns.find((col) =>
					col.tasks.some((task) => task.id === taskId),
				);

				if (sourceColumn && sourceColumn.id !== targetColumn.id) {
					// Moving to a different column - append to end
					try {
						await moveTask(taskId, targetColumn.id, targetColumn.tasks.length);
					} catch (error) {
						console.error('Failed to move task to column:', error);
					}
				}
				return;
			}

			// Dropping on another task
			const sourceColumn = currentColumns.find((col) =>
				col.tasks.some((task) => task.id === taskId),
			);

			const targetTaskColumn = currentColumns.find((col) =>
				col.tasks.some((task) => task.id === overId),
			);

			if (!sourceColumn || !targetTaskColumn) {
				console.warn('Could not find source or target column for task move');
				return;
			}

			// Find indices - use current columns state which includes handleDragOver's optimistic updates
			const currentIndex = sourceColumn.tasks.findIndex((task) => task.id === taskId);
			const targetIndex = targetTaskColumn.tasks.findIndex(
				(task) => task.id === overId,
			);

			const destinationColumnId = targetTaskColumn.id;
			const destinationIndex =
				sourceColumn.id === destinationColumnId && targetIndex === -1
					? sourceColumn.tasks.length - 1
					: targetIndex;

			const originColumnId = origin?.columnId ?? sourceColumn.id;
			const originIndex = origin?.index ?? currentIndex;

			// Check if move is needed
			const needsMove =
				originColumnId !== destinationColumnId || originIndex !== destinationIndex;

			if (needsMove) {
				try {
					console.log('Moving task:', {
						taskId,
						targetColumnId: destinationColumnId,
						targetIndex: destinationIndex,
						currentIndex: originIndex,
						sameColumn: originColumnId === destinationColumnId,
					});
					await moveTask(taskId, destinationColumnId, destinationIndex);
				} catch (error) {
					console.error('Failed to move task:', error);
				}
			}
		},
		[moveTask],
	);

	const handleCreateColumn = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!newColumnTitle.trim() || creatingColumn) return;
			setCreatingColumn(true);
			try {
				await createRealColumn(newColumnTitle.trim());
				setIsCreatingColumn(false);
				setNewColumnTitle('');
			} catch (error) {
				console.error('Error creating column:', error);
			} finally {
				setCreatingColumn(false);
			}
		},
		[newColumnTitle, creatingColumn, createRealColumn],
	);

	const handleUpdateColumn = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!editingColumnTitle.trim() || !editingColumn || updatingColumn)
				return;
			setUpdatingColumn(true);
			try {
				await updateRealColumn(editingColumn?.id, editingColumnTitle.trim());
				setIsEditingColumn(false);
				setEditingColumnTitle('');
				setEditingColumn(null);
			} catch (error) {
				console.error('Error updating column:', error);
			} finally {
				setUpdatingColumn(false);
			}
		},
		[editingColumnTitle, editingColumn, updatingColumn, updateRealColumn],
	);

	const handleInlineSaveColumn = useCallback(
		async (columnId: string, title: string) => {
			if (!title.trim()) return;
			setInlineSavingColumnId(columnId);
			setColumns((prev: ColumnWithTasks[]) =>
				prev.map((col) =>
					col.id === columnId ? { ...col, title: title.trim() } : col,
				),
			);
			try {
				await updateRealColumn(columnId, title.trim());
			} catch (error) {
				console.error('Error updating column:', error);
			} finally {
				setInlineSavingColumnId(null);
			}
		},
		[setColumns, updateRealColumn],
	);

	const clearFilters = useCallback(() => {
		setFilters({
			priority: [],
			dueDate: null,
			assignee: [],
		});
	}, []);

	// Drag-to-scroll handlers (360-degree plane)
	const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		// Only start drag-to-scroll if clicking on the container itself, not on interactive elements
		const target = e.target as HTMLElement;
		if (
			target.closest('button') ||
			target.closest('[role="button"]') ||
			target.closest('input') ||
			target.closest('textarea') ||
			target.closest('select') ||
			target.closest('[data-draggable]') ||
			target.closest('[data-sortable-id]')
		) {
			return;
		}

		// Only enable drag-to-scroll on large screens (lg breakpoint)
		if (window.innerWidth < 1024) {
			return;
		}

		if (scrollContainerRef.current) {
			setIsDraggingScroll(true);
			const rect = scrollContainerRef.current.getBoundingClientRect();
			setStartX(e.pageX - rect.left);
			setStartY(e.pageY - rect.top);
			setScrollLeft(scrollContainerRef.current.scrollLeft);
			setScrollTop(scrollContainerRef.current.scrollTop);
			scrollContainerRef.current.style.userSelect = 'none';
		}
	}, []);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!isDraggingScroll || !scrollContainerRef.current) return;
			e.preventDefault();
			const rect = scrollContainerRef.current.getBoundingClientRect();
			const x = e.pageX - rect.left;
			const y = e.pageY - rect.top;
			const walkX = (x - startX) * 2; // Scroll speed multiplier
			const walkY = (y - startY) * 2; // Scroll speed multiplier
			scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
			scrollContainerRef.current.scrollTop = scrollTop - walkY;
		},
		[isDraggingScroll, startX, startY, scrollLeft, scrollTop],
	);

	const handleMouseUp = useCallback(() => {
		if (scrollContainerRef.current) {
			setIsDraggingScroll(false);
			scrollContainerRef.current.style.userSelect = '';
		}
	}, []);

	const handleMouseLeave = useCallback(() => {
		if (scrollContainerRef.current) {
			setIsDraggingScroll(false);
			scrollContainerRef.current.style.userSelect = '';
		}
	}, []);

	// Global mouse event handlers for drag-to-scroll (360-degree plane)
	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (!isDraggingScroll || !scrollContainerRef.current) return;
			e.preventDefault();
			const rect = scrollContainerRef.current.getBoundingClientRect();
			const x = e.pageX - rect.left;
			const y = e.pageY - rect.top;
			const walkX = (x - startX) * 2;
			const walkY = (y - startY) * 2;
			scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
			scrollContainerRef.current.scrollTop = scrollTop - walkY;
		};

		const handleGlobalMouseUp = () => {
			if (scrollContainerRef.current) {
				setIsDraggingScroll(false);
				scrollContainerRef.current.style.userSelect = '';
			}
		};

		if (isDraggingScroll) {
			document.addEventListener('mousemove', handleGlobalMouseMove);
			document.addEventListener('mouseup', handleGlobalMouseUp);
		}

		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	}, [isDraggingScroll, startX, startY, scrollLeft, scrollTop]);

	// filter columns - memoized
	const filteredColumns = useMemo(
		() =>
			columns.map((column) => ({
				...column,
				tasks: column.tasks.filter((task) => {
					if (
						filters.priority.length > 0 &&
						!filters.priority.includes(task.priority.toLowerCase())
					) {
						return false;
					}
					if (filters.dueDate && task.dueDate) {
						const taskDate = new Date(task.dueDate).toDateString();
						const filterDate = new Date(filters.dueDate ?? '').toDateString();
						if (taskDate !== filterDate) {
							return false;
						}
					}

					return true;
				}),
			})),
		[columns, filters],
	);

	if (loading) {
		return <BoardLoader message="Loading board..." />;
	}

	if (error) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="text-center">
					<p className="text-lg font-medium text-red-600">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
				<Navbar
					boardTitle={board?.title}
					onEditBoard={() => {
						setNewTitle(board?.title ?? '');
						setNewColor(board?.color ?? '');
						setIsEditingTitle(true);
					}}
					onFilterClick={() => setIsFilterOpen(true)}
					filterCount={filterCount}
				/>
				<Dialog open={isEditngTitle} onOpenChange={setIsEditingTitle}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Edit Board</DialogTitle>
						</DialogHeader>
						<form className="space-y-4" onSubmit={handleUpdateBoard}>
							<div className="space-y-2">
								<Label htmlFor="boardTitle">Board Title</Label>
								<Input
									id="boardTitle"
									autoFocus={true}
									className="selection:bg-gray-500 selection:text-white"
									value={newTitle}
									onChange={(e) => setNewTitle(e.target.value)}
									placeholder="Enter board title..."
									required
								/>
							</div>

							<div className="space-y-2">
								<Label>Board Color</Label>
								<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
									{[
										'bg-blue-500',
										'bg-green-500',
										'bg-red-500',
										'bg-yellow-500',
										'bg-purple-500',
										'bg-orange-500',
										'bg-pink-500',
										'bg-teal-500',
										'bg-indigo-500',
										'bg-violet-500',
										'bg-cyan-500',
										'bg-emerald-500',
									].map((color, key) => (
										<button
											type="button"
											key={key}
											className={`w-8 h-8 rounded-full ${color} ${
												color === newColor
													? 'ring-2 ring-offset-2 ring-gray-600'
													: ''
											}`}
											onClick={() => setNewColor(color)}></button>
									))}
								</div>
							</div>
							<div className="flex justify-end space-x-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setIsEditingTitle(false)}>
									Cancel
								</Button>
								<Button
									className="focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary"
									type="submit"
									disabled={updatingBoardTitle}>
									{updatingBoardTitle ? (
										<>
											<Loader2 className="mr-2 w-4 h-4 animate-spin" />
											Updating...
										</>
									) : (
										'Save Changes'
									)}
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
				<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Filter Tasks</DialogTitle>
							<p className="text-sm text-gray-600">
								Filter tasks by priority, assignee, or due date.
							</p>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Priority </Label>
								<div className="flex flex-wrap gap-2">
									{['low', 'medium', 'high'].map((priority, key) => (
										<Button
											onClick={() => {
												const newPriorities = filters.priority.includes(
													priority,
												)
													? filters.priority.filter((p) => p !== priority)
													: [...filters.priority, priority];
												handleFilterChange('priority', newPriorities);
											}}
											key={key}
											variant={
												filters.priority.includes(priority)
													? 'default'
													: 'outline'
											}>
											{priority.charAt(0).toUpperCase() + priority.slice(1)}
										</Button>
									))}
								</div>
							</div>
							{/* <div className="space-y-2">
							<Label>Assignee </Label>
							<div className="flex flex-wrap gap-2">
								{['low', 'medium', 'high'].map((priority, key) => (
									<Button key={key} variant="outline">
										{priority.charAt(0).toUpperCase() + priority.slice(1)}
									</Button>
								))}
							</div>
						</div> */}
							<div className="space-y-2">
								<Label>Due Date </Label>
								<Input
									type="date"
									value={filters.dueDate ?? ''}
									onChange={(e) =>
										handleFilterChange('dueDate', e.target.value ?? null)
									}
									className="bg-transparent border-input focus:ring-2 focus:ring-primary selection:bg-primary selection:text-primary-foreground"
								/>
							</div>

							<div className="flex gap-2 justify-between pt-4">
								<Button type="button" variant="outline" onClick={clearFilters}>
									Clear Filters
								</Button>
								<Button
									type="button"
									variant="default"
									onClick={() => setIsFilterOpen(false)}>
									Apply Filters
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				{/* Board Content */}
				<main className="flex-1 flex flex-col w-full h-full min-w-0 min-h-0 px-4 sm:px-6 lg:px-8 pb-12">
					{/* Stats */}
					<div className="flex flex-col flex-shrink-0 gap-4 px-8 mb-6 space-y-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:space-y-0">
						<div className="flex flex-wrap gap-4 sm:gap-6">
							<div className="mt-3 text-sm text-gray-600">
								<span className="font-medium">Total Tasks: </span>
								{columns.reduce(
									(sum: number, col: ColumnWithTasks) => sum + col.tasks.length,
									0,
								)}
							</div>
						</div>

						{/* Add task dialog */}
						{/* <Dialog>
							<DialogTrigger asChild>
								<Button>
									<Plus />
									Add Task
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Create New Task</DialogTitle>
									<p className="text-sm text-gray-600">
										Add a new task to the board.
									</p>
								</DialogHeader>
								{columns.length > 0 && (
									<TaskForm
										columnId={columns[0].id}
										boardId={board?.id}
										onCreateTask={createTask}
									/>
								)}
							</DialogContent>
						</Dialog> */}
					</div>

					{/* Board Columns */}

					<DndContext // Dnd means => Drag and Drop
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}>
						<div
							ref={scrollContainerRef}
							onMouseDown={handleMouseDown}
							onMouseMove={handleMouseMove}
							onMouseUp={handleMouseUp}
							onMouseLeave={handleMouseLeave}
							className={`flex-1 flex flex-col lg:flex-row lg:space-x-6 overflow-auto lg:pb-6 lg:px-2 lg:mx-2 lg:[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-4 lg:space-y-0 min-w-0 min-h-0 ${
								isDraggingScroll ? 'cursor-grabbing' : 'cursor-grab'
							}`}>
							{filteredColumns.map((column, key) => (
								<DroppableColumn
									key={key}
									column={column}
									onCreateTask={createTask}
									onInlineSaveColumn={handleInlineSaveColumn}
									inlineSavingColumnId={inlineSavingColumnId}
									onDeleteColumn={deleteRealColumn}>
									<SortableContext
										items={column.tasks.map((task: Task) => task.id)}
										strategy={verticalListSortingStrategy}>
										<div className="space-y-3">
											{column.tasks.map((task, key: number) => (
												<SortableTask
													task={task}
													key={key}
													onEditTask={handleEditTask}
												/>
											))}
										</div>
									</SortableContext>
								</DroppableColumn>
							))}

							<div className="w-full lg:flex-shrink-0 lg:w-80">
								<div>
									<Button
										className="w-full h-full min-h-[130px] border-dashed border-2 text-gray-500 hover:text-gray-700"
										variant="outline"
										onClick={() => setIsCreatingColumn(true)}>
										<Plus />
										Add another list...
									</Button>
								</div>
							</div>

							<DragOverlay>
								{activeTask ? <TaskOverlay task={activeTask} /> : null}
							</DragOverlay>
						</div>
					</DndContext>
				</main>
			</div>
			<Dialog open={isCreatingColumn} onOpenChange={setIsCreatingColumn}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Create New Column</DialogTitle>
						<p className="text-sm text-gray-600">
							Add a new column to organize your tasks.
						</p>
					</DialogHeader>
					<form className="space-y-4" onSubmit={handleCreateColumn}>
						<div className="space-y-2">
							<Label>Column Title</Label>
							<Input
								id="columnTitle"
								autoFocus={true}
								className="selection:bg-gray-500 selection:text-white"
								value={newColumnTitle}
								name="columnTitle"
								placeholder="Enter column title..."
								onChange={(e) => setNewColumnTitle(e.target.value)}
								required
							/>
						</div>
						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsCreatingColumn(false)}>
								Cancel
							</Button>
							<Button type="submit" disabled={creatingColumn}>
								{creatingColumn ? (
									<>
										<Loader2 className="mr-2 w-4 h-4 animate-spin" />
										Creating...
									</>
								) : (
									'Create Column'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={isEditingColumn} onOpenChange={setIsEditingColumn}>
				<DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Column</DialogTitle>
						<p className="text-sm text-gray-600">Update the column title.</p>
					</DialogHeader>
					<form className="space-y-4" onSubmit={handleUpdateColumn}>
						<div className="space-y-2">
							<Label>Column Title</Label>
							<Input
								id="columnTitle"
								autoFocus={true}
								className="selection:bg-gray-500 selection:text-white"
								value={editingColumnTitle}
								name="columnTitle"
								placeholder="Enter column title..."
								onChange={(e) => setEditingColumnTitle(e.target.value)}
								required
							/>
						</div>
						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsEditingColumn(false);
									setEditingColumn(null);
									setEditingColumnTitle('');
								}}>
								Cancel
							</Button>
							<Button type="submit" disabled={updatingColumn}>
								{updatingColumn ? (
									<>
										<Loader2 className="mr-2 w-4 h-4 animate-spin" />
										Updating...
									</>
								) : (
									'Update Column'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit Task Dialog */}
			<Dialog open={isEditingTask} onOpenChange={setIsEditingTask}>
				<DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="text-lg font-medium">Edit Task</DialogTitle>
					</DialogHeader>
					{editingTask && board?.id && (
						<TaskDialog
							columnId={editingTask.columnId}
							boardId={board.id}
							task={editingTask as TaskDialogTask}
							onUpdateTask={handleUpdateTask}
							onTaskUpdated={handleTaskUpdated}
							onClose={() => {
								setIsEditingTask(false);
								setEditingTask(null);
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
