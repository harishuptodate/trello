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
import type { Task, Column, TaskPriority } from '@prisma/client';
import type { ColumnWithTasks } from '@/lib/services';
import { DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import {
	Calendar,
	MoreHorizontal,
	Plus,
	User as UserIcon,
	Check,
	X,
	Trash2,
	Pencil,
} from 'lucide-react';
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

export type ChecklistItem = {
	item: string;
	completed: boolean;
};

export type TaskData = {
	title: string;
	description?: string;
	assigneeId?: string;
	dueDate?: string;
	priority: 'low' | 'medium' | 'high';
	checklist?: ChecklistItem[];
};

type OrganizationMemberWithUser = {
	id: string;
	userId: string;
	role: 'ADMIN' | 'MEMBER';
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
};

type TaskFormProps = {
	columnId: string;
	boardId: string;
	task?:
		| (Task & {
				assignee: {
					id: string;
					name: string | null;
					email: string;
					image: string | null;
				} | null;
		  })
		| null;
	onCreateTask?: (columnId: string, taskData: TaskData) => Promise<void>;
	onUpdateTask?: (taskId: string, taskData: TaskData) => Promise<void>;
	onClose: () => void;
};

function TaskForm({
	columnId,
	boardId,
	task,
	onCreateTask,
	onUpdateTask,
	onClose,
}: TaskFormProps) {
	const [orgMembers, setOrgMembers] = useState<OrganizationMemberWithUser[]>(
		[],
	);
	const [loadingMembers, setLoadingMembers] = useState(false);

	useEffect(() => {
		if (boardId || columnId) {
			loadOrgMembers();
		}
	}, [boardId, columnId]);

	async function loadOrgMembers() {
		try {
			setLoadingMembers(true);
			let organizationId: string | null = null;

			if (boardId) {
				// Direct board ID
				const boardResponse = await fetch(`/api/boards/${boardId}`);
				if (boardResponse.ok) {
					const board = await boardResponse.json();
					organizationId = board.organizationId;
				}
			} else if (columnId) {
				// Get board ID from column
				const response = await fetch(`/api/columns/${columnId}`);
				if (response.ok) {
					const column = await response.json();
					const boardResponse = await fetch(`/api/boards/${column.boardId}`);
					if (boardResponse.ok) {
						const board = await boardResponse.json();
						organizationId = board.organizationId;
					}
				}
			}

			if (organizationId) {
				const membersResponse = await fetch(
					`/api/organizations/${organizationId}/members/list`,
				);
				if (membersResponse.ok) {
					const members = await membersResponse.json();
					setOrgMembers(members);
				}
			}
		} catch (err) {
			console.error('Failed to load org members:', err);
		} finally {
			setLoadingMembers(false);
		}
	}

	const isEditMode = !!(task && task.id && task.id.trim() !== '');
	const [title, setTitle] = useState(task?.title || '');
	const [description, setDescription] = useState(task?.description || '');
	const [assigneeId, setAssigneeId] = useState(task?.assigneeId || 'none');
	const [dueDate, setDueDate] = useState(
		task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
	);
	const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
		(task?.priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
	);
	const [checklist, setChecklist] = useState<ChecklistItem[]>(
		(task?.checklist as ChecklistItem[]) || [],
	);

	// Calculate checklist progress
	const completedCount = checklist.filter((item) => item.completed).length;
	const totalCount = checklist.length;
	const progressPercentage =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
	const isComplete = totalCount > 0 && completedCount === totalCount;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		// Filter out empty checklist items
		const validChecklist = checklist.filter(
			(item) => item.item.trim().length > 0,
		);

		const taskData: TaskData = {
			title: title.trim(),
			description: description.trim() || undefined,
			assigneeId: assigneeId && assigneeId !== 'none' ? assigneeId : undefined,
			dueDate: dueDate || undefined,
			priority,
			checklist: validChecklist.length > 0 ? validChecklist : undefined,
		};

		try {
			if (isEditMode && task?.id && onUpdateTask) {
				await onUpdateTask(task.id, taskData);
			} else if (!isEditMode && onCreateTask) {
				await onCreateTask(columnId, taskData);
			} else {
				console.error('Missing required handler:', {
					isEditMode,
					hasOnUpdateTask: !!onUpdateTask,
					hasOnCreateTask: !!onCreateTask,
				});
				return;
			}
			// Close dialog
			if (onClose) {
				onClose();
			} else {
				const trigger = document.querySelector(
					'[data-state="open"]',
				) as HTMLElement;
				if (trigger) trigger.click();
			}
		} catch (error) {
			console.error('Error saving task:', error);
		}
	};

	const addChecklistItem = () => {
		setChecklist([...checklist, { item: '', completed: false }]);
	};

	const updateChecklistItem = (
		index: number,
		updates: Partial<ChecklistItem>,
	) => {
		const updated = [...checklist];
		updated[index] = { ...updated[index], ...updates };
		setChecklist(updated);
	};

	const removeChecklistItem = (index: number) => {
		setChecklist(checklist.filter((_, i) => i !== index));
	};

	return (
		<form className="space-y-4" onSubmit={handleSubmit}>
			<div className="space-y-2">
				<Label>Title*</Label>
				<Input
					id="title"
					className="selection:bg-gray-500 selection:text-white"
					autoFocus={true}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="Enter task title..."
					required
				/>
			</div>
			<div className="space-y-2">
				<Label>Description</Label>
				<Textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Enter task description..."
					rows={3}
				/>
			</div>
			<div className="space-y-2">
				<Label>Assignee</Label>
				<Select value={assigneeId} onValueChange={setAssigneeId}>
					<SelectTrigger>
						<SelectValue placeholder="Select assignee..." />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">None</SelectItem>
						{orgMembers.length > 0 &&
							orgMembers.map((member) => {
								return (
									<SelectItem key={member.user.id} value={member.user.id}>
										{member.user.name || member.user.email || 'No assignee'}
									</SelectItem>
								);
							})}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Priority</Label>
				<Select
					value={priority}
					onValueChange={(value: 'low' | 'medium' | 'high') =>
						setPriority(value)
					}>
					<SelectTrigger>
						<SelectValue placeholder="Select task priority..." />
					</SelectTrigger>
					<SelectContent>
						{['low', 'medium', 'high'].map((p) => (
							<SelectItem key={p} value={p}>
								{p.charAt(0).toUpperCase() + p.slice(1)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Due Date</Label>
				<Input
					type="date"
					id="dueDate"
					value={dueDate}
					onChange={(e) => setDueDate(e.target.value)}
				/>
			</div>

			{/* Checklist Section */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label>Checklist</Label>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addChecklistItem}>
						<Plus className="w-4 h-4 mr-1" />
						Add Item
					</Button>
				</div>

				{checklist.length > 0 && (
					<div className="space-y-3">
						{/* Progress Bar */}
						<div className="space-y-1">
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-600">
									{completedCount} of {totalCount} completed
								</span>
								{isComplete && (
									<span className="text-green-600 font-medium flex items-center gap-1">
										<Check className="w-4 h-4" />
										100%
									</span>
								)}
							</div>
							<div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
								<div
									className={`h-full transition-all duration-300 ${
										isComplete ? 'bg-green-500' : 'bg-blue-500'
									}`}
									style={{ width: `${progressPercentage}%` }}
								/>
							</div>
						</div>

						{/* Checklist Items */}
						<div className="space-y-2 max-h-60 overflow-y-auto">
							{checklist.map((item, index) => (
								<div key={index} className="flex items-center gap-2">
									<input
										type="checkbox"
										checked={item.completed}
										onChange={(e) =>
											updateChecklistItem(index, {
												completed: e.target.checked,
											})
										}
										className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0"
									/>
									<Input
										value={item.item}
										onChange={(e) =>
											updateChecklistItem(index, { item: e.target.value })
										}
										placeholder="Checklist item..."
										className={`flex-1  ${
											item.completed ? 'line-through text-gray-500' : ''
										}`}
									/>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => removeChecklistItem(index)}
										className="text-red-500 hover:text-red-700 flex-shrink-0">
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end space-x-2 pt-4">
				<Button type="submit" disabled={!title.trim()}>
					{isEditMode ? 'Update Task' : 'Create Task'}
				</Button>
			</div>
		</form>
	);
}

function DroppableColumn({
	column,
	children,
	onCreateTask,
	onEditColumn,
}: {
	column: ColumnWithTasks;
	children: React.ReactNode;
	onCreateTask: (columnId: string, taskData: any) => Promise<void>;
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
							<TaskForm
								columnId={column.id}
								boardId={column.boardId}
								task={null}
								onCreateTask={onCreateTask}
								onClose={() => {}}
							/>
						</DialogContent>
					</Dialog>
				</div>
			</div>
		</div>
	);
}

function SortableTask({
	task,
	onEditTask,
}: {
	task: Task & {
		assignee: {
			id: string;
			name: string | null;
			email: string;
			image: string | null;
		} | null;
	};
	onEditTask?: (
		task: Task & {
			assignee: {
				id: string;
				name: string | null;
				email: string;
				image: string | null;
			} | null;
		},
	) => void;
}) {
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

	// Calculate checklist progress
	const checklist = (task.checklist as ChecklistItem[]) || [];
	const completedCount = checklist.filter(
		(item: ChecklistItem) => item.completed,
	).length;
	const totalCount = checklist.length as number;
	const progressPercentage =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
	const isComplete = totalCount > 0 && completedCount === totalCount;

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
							{onEditTask && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 shrink-0"
									onClick={(e) => {
										e.stopPropagation();
										onEditTask(task);
									}}>
									<Pencil className="w-3 h-3" />
								</Button>
							)}
						</div>

						{/* Task Description */}
						<p className="text-xs text-gray-600 line-clamp-2">
							{task.description ?? 'No description'}
						</p>

						{/* Checklist Progress */}
						{totalCount > 0 && (
							<div className="space-y-1">
								<div className="flex items-center justify-between text-xs">
									<span className="text-gray-600">
										{completedCount} of {totalCount} completed
									</span>
									{isComplete && (
										<span className="text-green-600 font-medium flex items-center gap-1">
											<Check className="w-3 h-3" />
										</span>
									)}
								</div>
								<div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
									<div
										className={`h-full transition-all duration-300 ${
											isComplete ? 'bg-green-500' : 'bg-blue-500'
										}`}
										style={{ width: `${progressPercentage}%` }}
									/>
								</div>
							</div>
						)}

						{/* Task Metadata */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
								{task.assignee && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<UserIcon className="w-3 h-3 shrink-0" />
										<span className="truncate italic">
											{task.assignee.name ||
												task.assignee.email ||
												'No assignee'}
										</span>
									</div>
								)}
								{task.dueDate && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<Calendar className="w-3 h-3 shrink-0" />
										<span className="truncate">
											{new Date(task.dueDate).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
							<div
								className={`w-2 h-2 rounded-full shrink-0 ${getPriorityColor(
									task.priority.toLowerCase() as 'low' | 'medium' | 'high',
								)}`}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function TaskOverlay({
	task,
}: {
	task: Task & {
		assignee: {
			id: string;
			name: string | null;
			email: string;
			image: string | null;
		} | null;
	};
}) {
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
										<UserIcon className="w-3 h-3 shrink-0" />
										<span className="truncate italic">
											{task.assignee.name ||
												task.assignee.email ||
												'No assignee'}
										</span>
									</div>
								)}
								{task.dueDate && (
									<div className="flex items-center space-x-1 text-xs text-gray-600 min-w-0">
										<Calendar className="w-3 h-3 shrink-0" />
										<span className="truncate">
											{new Date(task.dueDate).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
							<div
								className={`w-2 h-2 rounded-full shrink-0 ${getPriorityColor(
									task.priority.toLowerCase() as 'low' | 'medium' | 'high',
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
		updateRealTask,
	} = useBoard(id);
	const [isEditngTitle, setIsEditingTitle] = useState(false);
	const [newTitle, setNewTitle] = useState('');
	const [newColor, setNewColor] = useState('');

	const [activeTask, setActiveTask] = useState<
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

	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [isCreatingColumn, setIsCreatingColumn] = useState(false);
	const [isEditingColumn, setIsEditingColumn] = useState(false);
	const [isEditingTask, setIsEditingTask] = useState(false);
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
	async function createTask(columnId: string, taskData: TaskData) {
		await createRealTask(columnId, taskData);
	}
	async function handleCreateTask(taskData: TaskData) {
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
	}

	function handleEditTask(
		task: Task & {
			assignee: {
				id: string;
				name: string | null;
				email: string;
				image: string | null;
			} | null;
		},
	) {
		setEditingTask(task);
		setIsEditingTask(true);
	}

	async function handleUpdateTask(taskId: string, taskData: TaskData) {
		if (!updateRealTask) return;
		try {
			await updateRealTask(taskId, {
				title: taskData.title,
				description: taskData.description ?? null,
				assigneeId: taskData.assigneeId ?? null,
				dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
				priority: taskData.priority.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH',
				checklist: taskData.checklist || null,
			});
			setIsEditingTask(false);
			setEditingTask(null);
		} catch (error) {
			console.error('Error updating task:', error);
		}
	}

	function handleDragStart(event: DragStartEvent) {
		const taskId = event.active.id as string;
		const task = columns
			.flatMap((col) => col.tasks)
			.find((task) => task.id === taskId);

		if (task) {
			setActiveTask(
				task as Task & {
					assignee: {
						id: string;
						name: string | null;
						email: string;
						image: string | null;
					} | null;
				},
			);
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
	}));

	return (
		<>
			<div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
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
				<main className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1920px] mx-auto overflow-hidden">
					{/* Stats */}
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-6 space-y-4 sm:space-y-0 px-8 flex-shrink-0">
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
							className={`flex-1 flex flex-col lg:flex-row lg:space-x-6 lg:overflow-x-auto lg:overflow-y-hidden lg:pb-6 lg:px-2 lg:mx-2 lg:[&::-webkit-scrollbar]:h-2 lg:[&::-webkit-scrollbar-track]:bg-gray-100 lg:[&::-webkit-scrollbar-thumb]:bg-gray-300 lg:[&::-webkit-scrollbar-thumb]:rounded-full space-y-4 lg:space-y-0 min-h-0 ${
								isDraggingScroll ? 'lg:cursor-grabbing' : 'lg:cursor-grab'
							}`}>
							{filteredColumns.map((column, key) => (
								<DroppableColumn
									key={key}
									column={column}
									onCreateTask={createTask}
									onEditColumn={handleEditColumn}>
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

			{/* Edit Task Dialog */}
			<Dialog open={isEditingTask} onOpenChange={setIsEditingTask}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Task</DialogTitle>
						<p className="text-sm text-gray-600">
							Update task details and checklist.
						</p>
					</DialogHeader>
					{editingTask && board?.id && (
						<TaskForm
							columnId={editingTask.columnId}
							boardId={board.id}
							task={editingTask}
							onUpdateTask={handleUpdateTask}
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
