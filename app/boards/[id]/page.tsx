'use client';

import Navbar from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBoard } from '@/lib/hooks/useBoards';
import type { Board, ColumnWithTasks, Task } from '@/lib/supabase/models';
import { DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import { Calendar, MoreHorizontal, Plus, User } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import {
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragOverlay,
	DragStartEvent,
	closestCenter,
	useDroppable,
	useSensor,
	PointerSensor,
	KeyboardSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';

export type TaskData = {
	title: string;
	description?: string;
	assignee?: string;
	dueDate?: string;
	priority: 'low' | 'medium' | 'high';
};

function DroppableColumn({
	column,
	children,
	onCreateTask,
	onEditColumn,
}: {
	column: ColumnWithTasks;
	children: React.ReactNode;
	onCreateTask: (taskData: any) => Promise<void>;
	onEditColumn: (column: ColumnWithTasks) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: column.id });
	return (
		<div
			ref={setNodeRef}
			className={`w-full lg:flex-shrink-0 lg:w-80 ${
				isOver ? 'bg-blue-50' : ''
			}`}>
			<div
				className={`bg-white rounded-lg shadow-sm border ${
					isOver ? 'ring-2 ring-blue-300' : ''
				}`}>
				{/* Column Header */}
				<div className="p-3 sm:p-4 border-b">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2 min-w-0">
							<h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
								{column.title}
							</h3>
							<Badge variant="secondary" className="text-xs flex-shrink-0">
								{column.tasks.length}
							</Badge>
						</div>
						<Button
							variant="ghost"
							size="sm"
							className="flex-shrink-0"
							onClick={() => onEditColumn(column)}>
							<MoreHorizontal />
						</Button>
					</div>
				</div>
				{/* columns content */}
				<div className=" p-2">
					{children}
					<Dialog>
						<DialogTrigger asChild>
							<Button
								variant="secondary"
								className="w-full mt-3 text-gray-500 hover:text-gray-700">
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
							<form className="space-y-4" onSubmit={onCreateTask}>
								<div className="space-y-2">
									<Label>Title*</Label>
									<Input
										id="title"
										name="title"
										placeholder="Enter task title..."
									/>
								</div>
								<div className="space-y-2">
									<Label>Description</Label>
									<Textarea // why not Input here// ans: because we want to allow the user to enter a long description, which can  be typed line by line
										id="description"
										name="description"
										placeholder="Enter task description..."
										rows={3}
									/>
								</div>
								<div className="space-y-2">
									<Label>Assignee</Label>
									<Input
										id="assignee"
										name="assignee"
										placeholder="Enter task assignee..."
									/>
								</div>
								<div className="space-y-2">
									<Label>Priority</Label>
									<Select name="priority" defaultValue="medium">
										<SelectTrigger>
											<SelectValue placeholder="Select task priority..." />
										</SelectTrigger>
										<SelectContent>
											{['low', 'medium', 'high'].map((priority, key) => (
												<SelectItem key={key} value={priority}>
													{priority.charAt(0).toUpperCase() + priority.slice(1)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Due Date</Label>
									<Input type="date" id="dueDate" name="dueDate" className="" />
								</div>
								<div className="flex justify-end space-x-2 pt-4">
									<Button type="submit">Create Task</Button>
								</div>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</div>
	);
}

function SortableTask({ task }: { task: Task }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id });
	const styles = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};
	function getPriorityColor(priority: 'low' | 'medium' | 'high'): string {
		switch (priority) {
			case 'high':
				return 'bg-red-500';
			case 'medium':
				return 'bg-yellow-500';
			case 'low':
				return 'bg-green-500';
			default:
				return 'bg-yellow-500';
		}
	}
	return (
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			style={styles}
			data-sortable-id={task.id}>
			<Card className="cursor-pointer hover:shadow-md transition-shadow">
				<CardContent className="">
					<div className="space-y-1 sm:space-y-2">
						{/* Task Header */}
						<div className="flex items-start justify-between">
							<h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 min-w-0 pr-2">
								{task.title}
							</h4>
						</div>

						{/* Task Description */}
						<p className="text-xs text-gray-600 line-clamp-2">
							{task.description ?? 'No description'}
						</p>
						{/* Task Metadata */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
								{task.assignee && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<User className="w-3 h-3 shrink-0" />
										<span className="truncate italic">
											{task.assignee ?? 'No assignee'}
										</span>
									</div>
								)}
								{task.due_date && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<Calendar className="w-3 h-3 shrink-0" />
										<span className="truncate">
											{task.due_date ?? 'No due date'}
										</span>
									</div>
								)}
							</div>
							<div
								className={`w-2 h-2 rounded-full shrink-0 ${getPriorityColor(
									task.priority,
								)}`}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function TaskOverlay({ task }: { task: Task }) {
	function getPriorityColor(priority: 'low' | 'medium' | 'high'): string {
		switch (priority) {
			case 'high':
				return 'bg-red-500';
			case 'medium':
				return 'bg-yellow-500';
			case 'low':
				return 'bg-green-500';
			default:
				return 'bg-yellow-500';
		}
	}
	return (
		<div>
			<Card className="cursor-pointer hover:shadow-md transition-shadow">
				<CardContent className="">
					<div className="space-y-1 sm:space-y-2">
						{/* Task Header */}
						<div className="flex items-start justify-between">
							<h4 className="font-medium text-gray-900 text-sm leading-tight flex-1 min-w-0 pr-2">
								{task.title}
							</h4>
						</div>

						{/* Task Description */}
						<p className="text-xs text-gray-600 line-clamp-2">
							{task.description ?? 'No description'}
						</p>
						{/* Task Metadata */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
								{task.assignee && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<User className="w-3 h-3 shrink-0" />
										<span className="truncate italic">
											{task.assignee ?? 'No assignee'}
										</span>
									</div>
								)}
								{task.due_date && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<Calendar className="w-3 h-3 shrink-0" />
										<span className="truncate">
											{task.due_date ?? 'No due date'}
										</span>
									</div>
								)}
							</div>
							<div
								className={`w-2 h-2 rounded-full shrink-0 ${getPriorityColor(
									task.priority,
								)}`}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

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
	} = useBoard(id);
	const [isEditngTitle, setIsEditingTitle] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newColor, setNewColor] = useState('');

	const [activeTask, setActiveTask] = useState<Task | null>(null);

	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [isCreatingColumn, setIsCreatingColumn] = useState(false);
	const [isEditingColumn, setIsEditingColumn] = useState(false);

	const [newColumnTitle, setNewColumnTitle] = useState('');
	const [editingColumnTitle, setEditingColumnTitle] = useState('');

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
	const [scrollLeft, setScrollLeft] = useState(0);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	function handleFilterChange(
		type: 'priority' | 'dueDate' | 'assignee',
		value: string | string[] | null,
	) {
		setFilters((prev) => ({ ...prev, [type]: value }));
	}
	async function handleUpdateBoard(e: React.FormEvent) {
		e.preventDefault();
		if (!newTitle.trim() || !board) return;
		try {
			await updateBoard(board.id, {
				title: newTitle.trim(),
				color: newColor || board.color,
			});
			setIsEditingTitle(false);
		} catch (error) {}
	}
	async function createTask(taskData: TaskData) {
		const targetColumn = columns[0];
		if (!targetColumn) throw new Error('No columns found');

		await createRealTask(targetColumn.id, taskData);
		const trigger = document.querySelector(
			'[data-state="open"]',
		) as HTMLElement;
		if (trigger) trigger.click();
	}
	async function handleCreateTask(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const taskData = {
			title: formData.get('title') as string,
			description: (formData.get('description') as string) ?? undefined, // this better or || undefined ? // ans
			assignee: (formData.get('assignee') as string) ?? undefined,
			dueDate: (formData.get('dueDate') as string) ?? undefined,
			priority:
				(formData.get('priority') as 'low' | 'medium' | 'high') ?? 'medium',
		};
		if (taskData.title.trim() === '') return;
		try {
			await createTask(taskData);
		} catch (error) {
			console.error('Error creating task:', error);
		}
	}

	function handleDragStart(event: DragStartEvent) {
		const taskId = event.active.id as string;
		const task = columns
			.flatMap((col) => col.tasks)
			.find((task) => task.id === taskId);

		if (task) {
			setActiveTask(task);
		}
	}

	function handleDragOver(event: DragOverEvent) {
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
	}

	async function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over) return;

		const taskId = active.id as string;
		const overId = over.id as string;

		const targetColumn = columns.find((col) => col.id === overId);
		if (targetColumn) {
			const sourceColumn = columns.find((col) =>
				col.tasks.some((task) => task.id === taskId),
			);

			if (sourceColumn && sourceColumn.id !== targetColumn.id) {
				await moveTask(taskId, targetColumn.id, targetColumn.tasks.length);
			}
		} else {
			// Check to see if were dropping on another task
			const sourceColumn = columns.find((col) =>
				col.tasks.some((task) => task.id === taskId),
			);

			const targetColumn = columns.find((col) =>
				col.tasks.some((task) => task.id === overId),
			);

			if (sourceColumn && targetColumn) {
				const oldIndex = sourceColumn.tasks.findIndex(
					(task) => task.id === taskId,
				);

				const newIndex = targetColumn.tasks.findIndex(
					(task) => task.id === overId,
				);

				if (oldIndex !== newIndex) {
					await moveTask(taskId, targetColumn.id, newIndex);
				}
			}
		}
	}

	async function handleCreateColumn(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!newColumnTitle.trim()) return;
		await createRealColumn(newColumnTitle.trim());
		setIsCreatingColumn(false);
		setNewColumnTitle('');
	}
	// handle update column
	async function handleUpdateColumn(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!editingColumnTitle.trim() || !editingColumn) return;
		await updateRealColumn(editingColumn?.id, editingColumnTitle.trim());
		setIsEditingColumn(false);
		setEditingColumnTitle('');
		setEditingColumn(null);
	}
	// handle edit column
	function handleEditColumn(column: ColumnWithTasks) {
		setEditingColumn(column);
		setIsEditingColumn(true);
		setEditingColumnTitle(column.title);
	}

	function clearFilters() {
		setFilters({
			priority: [],
			dueDate: null,
			assignee: [],
		});
	}

	// Drag-to-scroll handlers
	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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
			setScrollLeft(scrollContainerRef.current.scrollLeft);
			scrollContainerRef.current.style.userSelect = 'none';
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!isDraggingScroll || !scrollContainerRef.current) return;
		e.preventDefault();
		const rect = scrollContainerRef.current.getBoundingClientRect();
		const x = e.pageX - rect.left;
		const walk = (x - startX) * 2; // Scroll speed multiplier
		scrollContainerRef.current.scrollLeft = scrollLeft - walk;
	};

	const handleMouseUp = () => {
		if (scrollContainerRef.current) {
			setIsDraggingScroll(false);
			scrollContainerRef.current.style.userSelect = '';
		}
	};

	const handleMouseLeave = () => {
		if (scrollContainerRef.current) {
			setIsDraggingScroll(false);
			scrollContainerRef.current.style.userSelect = '';
		}
	};

	// Global mouse event handlers for drag-to-scroll
	useEffect(() => {
		const handleGlobalMouseMove = (e: MouseEvent) => {
			if (!isDraggingScroll || !scrollContainerRef.current) return;
			e.preventDefault();
			const rect = scrollContainerRef.current.getBoundingClientRect();
			const x = e.pageX - rect.left;
			const walk = (x - startX) * 2;
			scrollContainerRef.current.scrollLeft = scrollLeft - walk;
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
	}, [isDraggingScroll, startX, scrollLeft]);

	// filter columns
	const filteredColumns = columns.map((column) => ({
		...column,
		tasks: column.tasks.filter((task) => {
			if (
				filters.priority.length > 0 &&
				!filters.priority.includes(task.priority)
			) {
				return false;
			}
			if (filters.dueDate && task.due_date) {
				const taskDate = new Date(task.due_date).toDateString();
				const filterDate = new Date(filters.dueDate ?? '').toDateString();
				if (taskDate !== filterDate) {
					return false;
				}
			}

			return true;
		}),
	}));

	return (
		<>
			<div className="min-h-screen bg-gray-50">
				<Navbar
					boardTitle={board?.title}
					onEditBoard={() => {
						setNewTitle(board?.title ?? '');
						setNewColor(board?.color ?? '');
						setIsEditingTitle(true);
					}}
					onFilterClick={() => setIsFilterOpen(true)}
					filterCount={Object.values(filters).reduce(
						(count, v) =>
							count + (Array.isArray(v) ? v.length : v !== null ? 1 : 0),
						0,
					)}
				/>
				<Dialog open={isEditngTitle} onOpenChange={setIsEditingTitle}>
					<DialogContent className="w-[95vw] max-w-425px mx-auto">
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
								<div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
									type="submit">
									Save Changes
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
				<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
					<DialogContent className="w-[95vw] max-w-425px mx-auto">
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

							<div className="flex justify-between pt-4 gap-2">
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
				<main className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1920px] mx-auto">
					{/* Stats */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 space-y-4 sm:space-y-0 px-8">
						<div className="flex flex-wrap gap-4 sm:gap-6">
							<div className="text-sm text-gray-600">
								<span className="font-medium">Total Tasks: </span>
								{columns.reduce(
									(sum: number, col: ColumnWithTasks) => sum + col.tasks.length,
									0,
								)}
							</div>
						</div>

						{/* Add task dialog */}
						<Dialog>
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
										{' '}
										Add a new task to the board.
									</p>
								</DialogHeader>
								<form className="space-y-4" onSubmit={handleCreateTask}>
									<div className="space-y-2">
										<Label>Title*</Label>
										<Input
											id="title"
											name="title"
											placeholder="Enter task title..."
										/>
									</div>
									<div className="space-y-2">
										<Label>Description</Label>
										<Textarea // why not Input here// ans: because we want to allow the user to enter a long description, which can  be typed line by line
											id="description"
											name="description"
											placeholder="Enter task description..."
											rows={3}
										/>
									</div>
									<div className="space-y-2">
										<Label>Assignee</Label>
										<Input
											id="assignee"
											name="assignee"
											placeholder="Enter task assignee..."
										/>
									</div>
									<div className="space-y-2">
										<Label>Priority</Label>
										<Select name="priority" defaultValue="medium">
											<SelectTrigger>
												<SelectValue placeholder="Select task priority..." />
											</SelectTrigger>
											<SelectContent>
												{['low', 'medium', 'high'].map((priority, key) => (
													<SelectItem key={key} value={priority}>
														{priority.charAt(0).toUpperCase() +
															priority.slice(1)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Due Date</Label>
										<Input type="date" id="dueDate" name="dueDate" />
									</div>
									<div className="flex justify-end space-x-2 pt-4">
										<Button type="submit">Create Task</Button>
									</div>
								</form>
							</DialogContent>
						</Dialog>
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
							className={`flex flex-col lg:flex-row lg:space-x-6 lg:overflow-x-auto lg:pb-6 lg:px-2 lg:mx-2 lg:[&::-webkit-scrollbar]:h-2 lg:[&::-webkit-scrollbar-track]:bg-gray-100 lg:[&::-webkit-scrollbar-thumb]:bg-gray-300 lg:[&::-webkit-scrollbar-thumb]:rounded-full space-y-4 lg:space-y-0 ${
								isDraggingScroll ? 'lg:cursor-grabbing' : 'lg:cursor-grab'
							}`}>
							{filteredColumns.map((column, key) => (
								<DroppableColumn
									key={key}
									column={column}
									onCreateTask={handleCreateTask}
									onEditColumn={handleEditColumn}>
									<SortableContext
										items={column.tasks.map((task: Task) => task.id)}
										strategy={verticalListSortingStrategy}>
										<div className="space-y-3">
											{column.tasks.map((task: Task, key: number) => (
												<SortableTask task={task} key={key} />
											))}
										</div>
									</SortableContext>
								</DroppableColumn>
							))}

							<div className="w-full lg:flex-shrink-0 lg:w-80">
								<div>
									<Button
										className="w-full h-full min-h-[200px] border-dashed border-2 text-gray-500 hover:text-gray-700"
										variant="outline"
										onClick={() => setIsCreatingColumn(true)}>
										<Plus />
										Add another column...
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
				<DialogContent>
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
							<Button type="submit">Create Column</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={isEditingColumn} onOpenChange={setIsEditingColumn}>
				<DialogContent>
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
							<Button type="submit">Update Column</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
