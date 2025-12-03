import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Plus,
	Check,
	X as CloseIcon,
	Search,
	Loader2,
	Trash2,
	Eye,
	EyeClosedIcon,
	EyeClosed,
	User,
} from 'lucide-react';
import { InlineEdit } from '@/components/ui/inline-edit';

export type ChecklistItem = {
	item: string;
	completed: boolean;
};

export type TaskDialogTask = {
	id: string;
	title: string;
	description: string | null;
	dueDate: string | Date | null;
	priority: 'LOW' | 'MEDIUM' | 'HIGH';
	checklist: ChecklistItem[] | null;
	assignees?: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	}[];
	comments?: {
		id: string;
		content: string;
		userId: string;
		createdAt: Date | string;
		updatedAt: Date | string;
		user?: {
			id: string;
			name: string | null;
			email: string;
			image: string | null;
		} | null;
	}[];
};

export type TaskDialogData = {
	title: string;
	description?: string | null;
	assigneeIds?: string[];
	dueDate?: string;
	priority: 'low' | 'medium' | 'high';
	checklist?: ChecklistItem[];
};

type OrgMember = {
	user: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
};

type Props = {
	columnId: string;
	boardId: string;
	task?: TaskDialogTask | null;
	onCreateTask?: (columnId: string, taskData: TaskDialogData) => Promise<void>;
	onUpdateTask?: (taskId: string, taskData: TaskDialogData) => Promise<void>;
	onTaskUpdated?: (taskId: string, updatedTask: TaskDialogTask) => void;
	onClose?: () => void;
};

export function TaskDialog({
	columnId,
	boardId,
	task,
	onCreateTask,
	onUpdateTask,
	onTaskUpdated,
	onClose,
}: Props) {
	const isEditMode = !!task?.id;
	const [isOrgMembersLoaded, setIsOrgMembersLoaded] = useState(false);
	const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
	const [memberSearch, setMemberSearch] = useState('');
	const [memberResults, setMemberResults] = useState<
		{ id: string; name: string | null; email: string }[]
	>([]);
	const [searchingMembers, setSearchingMembers] = useState(false);

	const [title, setTitle] = useState(task?.title || '');
	const [description, setDescription] = useState(task?.description || '');
	const [assigneeIds, setAssigneeIds] = useState<string[]>(
		Array.from(
			new Set(
				(task?.assignees || []).map((a) => a.id).filter(Boolean) as string[],
			),
		),
	);
	const [dueDate, setDueDate] = useState(
		task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
	);
	const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(
		(task?.priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
	);
	const [checklist, setChecklist] = useState<ChecklistItem[]>(
		(task?.checklist as ChecklistItem[]) || [],
	);
	const [submitting, setSubmitting] = useState(false);

	const [commentsOpen, setCommentsOpen] = useState(true);
	const [comments, setComments] = useState(task?.comments || []);
	const [commentInput, setCommentInput] = useState('');
	const [commentSubmitting, setCommentSubmitting] = useState(false);
	const [loadingComments, setLoadingComments] = useState(false);

	// Store initial state for comparison
	const initialState = useMemo(() => {
		if (!task) return null;
		return {
			title: task.title || '',
			description: task.description || '',
			assigneeIds: Array.from(
				new Set(
					(task.assignees || []).map((a) => a.id).filter(Boolean) as string[],
				),
			).sort(),
			dueDate: task.dueDate
				? new Date(task.dueDate).toISOString().split('T')[0]
				: '',
			priority:
				(task.priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
			checklist: (task.checklist as ChecklistItem[]) || [],
		};
	}, [task]);

	// Check if form has changes
	const hasChanges = useMemo(() => {
		if (!isEditMode || !initialState) return false;

		// Compare title
		if (title.trim() !== initialState.title.trim()) return true;

		// Compare description
		const currentDesc = description.trim() || '';
		const initialDesc = initialState.description.trim() || '';
		if (currentDesc !== initialDesc) return true;

		// Compare assigneeIds (sorted arrays)
		const currentAssigneeIds = [...assigneeIds].sort();
		if (
			currentAssigneeIds.length !== initialState.assigneeIds.length ||
			!currentAssigneeIds.every(
				(id, idx) => id === initialState.assigneeIds[idx],
			)
		) {
			return true;
		}

		// Compare dueDate
		if (dueDate !== initialState.dueDate) return true;

		// Compare priority
		if (priority !== initialState.priority) return true;

		// Compare checklist
		if (checklist.length !== initialState.checklist.length) return true;
		for (let i = 0; i < checklist.length; i++) {
			const current = checklist[i];
			const initial = initialState.checklist[i];
			if (
				current.item.trim() !== initial.item.trim() ||
				current.completed !== initial.completed
			) {
				return true;
			}
		}

		return false;
	}, [
		isEditMode,
		initialState,
		title,
		description,
		assigneeIds,
		dueDate,
		priority,
		checklist,
	]);

	const getInitials = (name?: string | null, email?: string) => {
		const source = name || email || '';
		const parts = source.split(' ').filter(Boolean);
		if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		if (source.includes('@')) return source[0].toUpperCase();
		return source.slice(0, 2).toUpperCase();
	};

	const toggleAssignee = useCallback((userId: string) => {
		setAssigneeIds((prev) => {
			const isAdding = !prev.includes(userId);
			const newIds = isAdding
				? [...prev, userId]
				: prev.filter((id) => id !== userId);

			// Clear search results and input when adding a member
			if (isAdding) {
				setMemberResults([]);
				setMemberSearch('');
			}

			return newIds;
		});
	}, []);

	const loadOrgMembers = useCallback(async () => {
		try {
			let organizationId: string | null = null;

			if (boardId) {
				const boardResponse = await fetch(`/api/boards/${boardId}`);
				if (boardResponse.ok) {
					const board = await boardResponse.json();
					organizationId = board.organizationId;
				}
			} else if (columnId) {
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
					setIsOrgMembersLoaded(true);
				}
			}
		} catch (err) {
			console.error('Failed to load org members:', err);
		}
	}, [boardId, columnId]);

	useEffect(() => {
		loadOrgMembers();
	}, [loadOrgMembers]);

	// Sync form state when task changes
	useEffect(() => {
		if (task) {
			setTitle(task.title || '');
			setDescription(task.description || '');
			setAssigneeIds(
				Array.from(
					new Set(
						(task.assignees || []).map((a) => a.id).filter(Boolean) as string[],
					),
				),
			);
			setDueDate(
				task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
			);
			setPriority(
				(task.priority?.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
			);
			setChecklist((task.checklist as ChecklistItem[]) || []);
		}
	}, [task]);

	useEffect(() => {
		let active = true;
		const run = async () => {
			if (memberSearch.trim().length < 2) {
				setMemberResults([]);
				return;
			}
			setSearchingMembers(true);
			try {
				const res = await fetch(
					`/api/users/search?q=${encodeURIComponent(memberSearch.trim())}`,
				);
				if (res.ok) {
					const data = await res.json();
					if (active) setMemberResults(data.users || []);
				}
			} catch (err) {
				console.error('Failed to search users', err);
			} finally {
				if (active) setSearchingMembers(false);
			}
		};
		run();
		return () => {
			active = false;
		};
	}, [memberSearch]);

	const loadComments = useCallback(async () => {
		if (!isEditMode || !task?.id) return;
		setLoadingComments(true);
		try {
			const res = await fetch(`/api/tasks/${task.id}/comments`);
			if (res.ok) {
				const data = await res.json();
				setComments(data);
			}
		} catch (err) {
			console.error('Failed to load comments', err);
		} finally {
			setLoadingComments(false);
		}
	}, [isEditMode, task?.id]);

	useEffect(() => {
		loadComments();
	}, [loadComments]);

	const handleAddComment = useCallback(async () => {
		if (!task?.id || !commentInput.trim()) return;
		setCommentSubmitting(true);
		try {
			const res = await fetch(`/api/tasks/${task.id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: commentInput.trim() }),
			});
			if (res.ok) {
				const newComment = await res.json();
				setComments((prev) => [...prev, newComment]);
				setCommentInput('');
			}
		} catch (err) {
			console.error('Failed to add comment', err);
		} finally {
			setCommentSubmitting(false);
		}
	}, [task?.id, commentInput]);

	const saveChecklist = useCallback(
		async (updatedChecklist: ChecklistItem[]) => {
			if (!isEditMode || !task?.id) return;
			const validChecklist = updatedChecklist.filter(
				(item) => item.item.trim().length > 0,
			);
			try {
				const res = await fetch(`/api/tasks/${task.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						checklist: validChecklist.length > 0 ? validChecklist : null,
					}),
				});
				if (res.ok) {
					const updatedTask = await res.json();
					// Notify parent component to update the task in board state
					if (onTaskUpdated) {
						onTaskUpdated(task.id, {
							...task,
							checklist: validChecklist.length > 0 ? validChecklist : null,
						} as TaskDialogTask);
					}
				} else {
					console.error('Failed to save checklist');
				}
			} catch (err) {
				console.error('Failed to save checklist', err);
			}
		},
		[isEditMode, task, onTaskUpdated],
	);

	const addChecklistItem = useCallback(() => {
		setChecklist((prev) => [...prev, { item: '', completed: false }]);
	}, []);

	const updateChecklistItem = useCallback(
		async (index: number, updates: Partial<ChecklistItem>) => {
			setChecklist((prev) => {
				const updated = [...prev];
				updated[index] = { ...updated[index], ...updates };
				// Save to backend immediately if in edit mode
				if (isEditMode && task?.id) {
					// Save the updated checklist
					saveChecklist(updated).catch((err) => {
						console.error('Failed to save checklist:', err);
					});
				}
				return updated;
			});
		},
		[isEditMode, task?.id, saveChecklist],
	);

	const removeChecklistItem = useCallback(
		async (index: number) => {
			const updated = checklist.filter((_, i) => i !== index);
			setChecklist(updated);
			// Save to backend immediately if in edit mode
			if (isEditMode && task?.id) {
				saveChecklist(updated);
			}
		},
		[checklist, isEditMode, task?.id, saveChecklist],
	);

	const { completedCount, totalCount, progressPercentage, isComplete } =
		useMemo(() => {
			const completed = checklist.filter((item) => item.completed).length;
			const total = checklist.length;
			const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
			const complete = total > 0 && completed === total;
			return {
				completedCount: completed,
				totalCount: total,
				progressPercentage: progress,
				isComplete: complete,
			};
		}, [checklist]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || submitting) return;

		setSubmitting(true);
		const validChecklist = checklist.filter(
			(item) => item.item.trim().length > 0,
		);

		const taskData: TaskDialogData = {
			title: title.trim(),
			description: description.trim() || null,
			assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
			dueDate: dueDate || undefined,
			priority,
			checklist: validChecklist.length > 0 ? validChecklist : undefined,
		};

		try {
			if (isEditMode && task?.id && onUpdateTask) {
				await onUpdateTask(task.id, taskData);
			} else if (!isEditMode && onCreateTask) {
				await onCreateTask(columnId, taskData);
			}
			onClose?.();
		} catch (err) {
			console.error('Error saving task:', err);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className={`grid gap-y-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-x-4`}>
			<form className="space-y-4" onSubmit={handleSubmit}>
				{isEditMode ? (
					<div className="space-y-4">
						<InlineEdit
							value={title}
							onSave={(val) => setTitle(val)}
							placeholder="Enter task title..."
							label="Title*"
							initialEditing={!title}
						/>
						<InlineEdit
							value={description || ''}
							onSave={(val) => setDescription(val)}
							placeholder="Enter task description..."
							label="Description"
							multiline
						/>
					</div>
				) : (
					<>
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
					</>
				)}

				<div className="space-y-3">
					<div className="flex  gap-2 items-center">
						<Label>Members</Label>
						<div className="flex gap-2 items-center px-2 py-1 bg-white rounded-md border">
							<Search className="w-4 h-4 text-gray-400" />
							<input
								type="text"
								className="w-full text-sm bg-transparent outline-none"
								placeholder="Search name or email"
								value={memberSearch}
								onChange={(e) => setMemberSearch(e.target.value)}
							/>
						</div>
					</div>
					{memberResults.length > 0 && (
						<div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md border">
							{memberResults.map((user) => (
								<button
									type="button"
									key={user.id}
									onClick={() => toggleAssignee(user.id)}
									title={user.email}
									className="flex gap-2 items-center px-2 py-1 bg-white rounded-full border shadow-sm hover:bg-gray-100">
									<span className="inline-flex justify-center items-center w-7 h-7 text-xs font-semibold text-white bg-gray-800 rounded-full">
										{getInitials(user.name, user.email)}
									</span>
									<span className="text-sm">
										{user.name || user.email || 'User'}
									</span>
								</button>
							))}
						</div>
					)}
					{searchingMembers && (
						<div className="text-xs text-gray-500">Searching members…</div>
					)}
					<div className="flex flex-wrap gap-2">
						{assigneeIds.length === 0 && (
							<span className="text-sm text-gray-500">
								No members selected.
							</span>
						)}
						{assigneeIds.map((id) => {
							const member =
								orgMembers.find((m) => m.user.id === id)?.user ||
								memberResults.find((m) => m.id === id);
							const fullName = member?.name || member?.email || 'User';
							return (
								<div key={id} className="relative group flex items-center bg-gray-800 rounded-full" title={fullName}>
									<div className="inline-flex justify-center items-center w-8 h-8 text-sm font-semibold text-white bg-gray-800 rounded-full transition-all">
										{isOrgMembersLoaded ? (
											getInitials(member?.name, member?.email)
										) : (
											<User className="w-4 h-4" />
										)}
									</div>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											toggleAssignee(id);
										}}
										className="flex justify-center items-center w-0 h-8 bg-gray-800 rounded-r-full opacity-0 group-hover:w-8 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-700 overflow-hidden">
										<CloseIcon className="w-4 h-4 text-white" />
									</button>
								</div>
							);
						})}
					</div>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-2">
						<Label>Due Date</Label>
						<Input
							type="date"
							id="dueDate"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
						/>
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
				</div>

				<div className="space-y-3">
					<div className="flex justify-between items-center">
						<Label>Checklist</Label>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addChecklistItem}>
							<Plus className="mr-1 w-4 h-4" />
							Add Item
						</Button>
					</div>

					{checklist.length > 0 && (
						<div className="space-y-3">
							<div className="space-y-1">
								<div className="flex justify-between items-center text-sm">
									<span className="text-gray-600">
										{completedCount} of {totalCount} completed
									</span>
									{isComplete && (
										<span className="flex gap-1 items-center font-medium text-green-600">
											<Check className="w-4 h-4" />
											100%
										</span>
									)}
								</div>
								<div className="overflow-hidden relative h-2 bg-gray-200 rounded-full">
									<div
										className={`h-full transition-all duration-300 ${
											isComplete ? 'bg-green-500' : 'bg-blue-500'
										}`}
										style={{ width: `${progressPercentage}%` }}
									/>
								</div>
							</div>

							<div className="overflow-y-auto space-y-2 max-h-60">
								{checklist.map((item, index) => (
									<div key={index} className="flex gap-2 items-center">
										<input
											type="checkbox"
											checked={item.completed}
											onChange={(e) =>
												updateChecklistItem(index, {
													completed: e.target.checked,
												})
											}
											className="shrink-0 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
										/>
										{isEditMode ? (
											<InlineEdit
												value={item.item}
												onSave={(val) =>
													updateChecklistItem(index, { item: val })
												}
												placeholder="Checklist item..."
												className={`flex-1 ${
													item.completed ? 'line-through text-gray-500' : ''
												}`}
												initialEditing={!item.item}
											/>
										) : (
											<Input
												value={item.item}
												autoFocus={index === checklist.length - 1}
												onChange={(e) =>
													updateChecklistItem(index, { item: e.target.value })
												}
												placeholder="Checklist item..."
												className={`flex-1  ${
													item.completed ? 'line-through text-gray-500' : ''
												}`}
											/>
										)}
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => removeChecklistItem(index)}
											className="shrink-0 text-red-500 hover:text-red-700">
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				<div className="flex justify-end pt-4 space-x-2">
					<Button
						type="submit"
						disabled={
							!title.trim() || submitting || (isEditMode && !hasChanges)
						}
						className={
							isEditMode && hasChanges && title.trim() && !submitting
								? 'flex justify-end pt-2 space-x-2'
								: ''
						}>
						{submitting ? (
							<>
								<Loader2 className="mr-2 w-4 h-4 animate-spin" />
								{isEditMode ? 'Updating...' : 'Creating...'}
							</>
						) : isEditMode ? (
							'Update Task'
						) : (
							'Create Task'
						)}
					</Button>
				</div>
			</form>

			<div className="p-5 space-y-4 bg-gray-50 rounded-lg border min-w-0">
				<div className="flex justify-between items-center gap-2">
					<h3 className="font-semibold text-gray-800 text-base whitespace-nowrap">
						Comments and activity
					</h3>
					<Button
						variant="ghost"
						size="sm"
						className="shrink-0"
						onClick={() => setCommentsOpen((prev) => !prev)}>
						{commentsOpen ? (
							<Eye className="w-4 h-4" />
						) : (
							<EyeClosed className="w-4 h-4" />
						)}
					</Button>
				</div>
				{commentsOpen && (
					<div className="space-y-4">
						{isEditMode ? (
							<div className="w-full">
								<Textarea
									className="w-full bg-blue-50 ring-2 ring-blue-200 focus-visible:ring-blue-500 focus-visible:ring-1 min-h-[80px] resize-none"
									placeholder="Write a comment..."
									value={commentInput}
									onChange={(e) => setCommentInput(e.target.value)}
									onKeyDown={async (e) => {
										if (
											e.key === 'Enter' &&
											!e.shiftKey &&
											!e.ctrlKey &&
											!e.metaKey
										) {
											e.preventDefault();
											if (
												!task?.id ||
												!commentInput.trim() ||
												commentSubmitting
											)
												return;
											await handleAddComment();
										}
									}}
									disabled={commentSubmitting}
								/>
								{commentSubmitting && (
									<div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
										<Loader2 className="w-4 h-4 animate-spin" />
										<span>Posting...</span>
									</div>
								)}
							</div>
						) : (
							<div className="text-sm text-gray-500 p-3 bg-white rounded-md border">
								Comments will be available after the task is created.
							</div>
						)}
						<div className="overflow-y-auto pr-2 space-y-3 max-h-80">
							{loadingComments ? (
								<div className="text-sm text-gray-500">Loading comments...</div>
							) : comments.length === 0 ? (
								<div className="text-sm text-gray-500">
									{isEditMode
										? 'No comments yet. Be the first to comment.'
										: 'No comments yet.'}
								</div>
							) : (
								[...comments].reverse().map((comment) => (
									<div
										key={comment.id}
										className="p-4 bg-white rounded-md border shadow-sm">
										<div className="flex gap-3 items-start mb-2">
											<span className="inline-flex justify-center items-center w-6 h-6 text-xs font-semibold text-white bg-blue-500 rounded-full shrink-0">
												{getInitials(comment.user?.name, comment.user?.email)}
											</span>
											<div className="flex justify-between items-center min-w-0 flex-1">
												<p className="text-sm font-medium text-gray-900">
													{comment.user?.name || comment.user?.email || 'User'}
												</p>
												<p className="text-xs text-gray-500">
													{new Date(comment.createdAt).toLocaleString()}
												</p>
											</div>
										</div>
										<p className="text-sm text-gray-800 whitespace-pre-line break-words">
											{comment.content}
										</p>
									</div>
								))
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
