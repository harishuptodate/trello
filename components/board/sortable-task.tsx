'use client';

import { memo, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Check, User as UserIcon } from 'lucide-react';
import type { TaskWithAssignees } from '@/lib/services';
import { ChecklistItem } from '@/components/task-dialog';

type SortableTaskProps = {
	task: TaskWithAssignees;
	onEditTask?: (task: TaskWithAssignees) => void;
};

export const SortableTask = memo(function SortableTask({
	task,
	onEditTask,
}: SortableTaskProps) {
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

	const getPriorityColor = useCallback(
		(priority: 'low' | 'medium' | 'high'): string => {
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
		},
		[],
	);

	const getInitials = useCallback((name?: string | null, email?: string) => {
		const source = name || email || '';
		const parts = source.split(' ').filter(Boolean);
		if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
		if (source.includes('@')) return source[0].toUpperCase();
		return source.slice(0, 2).toUpperCase();
	}, []);

	const checklist = (task.checklist as ChecklistItem[]) || [];
	const { completedCount, totalCount, progressPercentage, isComplete } =
		useMemo(() => {
			const completed = checklist.filter(
				(item: ChecklistItem) => item.completed,
			).length;
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

	return (
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			style={styles}
			data-sortable-id={task.id}>
			<Card
				onClick={(e) => {
					e.stopPropagation();
					onEditTask?.(task);
				}}
				className="transition-shadow cursor-pointer hover:shadow-md">
				<CardContent>
					<div className="space-y-1 sm:space-y-2">
						<div className="flex justify-between items-center">
							<h4 className="flex-1 pr-2 min-w-0 text-sm font-medium leading-tight text-gray-900">
								{task.title}
							</h4>
							<div
								title={task.priority.toLowerCase() as 'low' | 'medium' | 'high' === 'high' ? 'High Priority' : task.priority.toLowerCase() as 'low' | 'medium' | 'high' === 'medium' ? 'Medium Priority' : 'Low Priority'}
									className={`w-4 h-4 rounded-full shrink-0 bg-amoeba ${getPriorityColor(
										task.priority.toLowerCase() as 'low' | 'medium' | 'high',
									)}`}
								/>
						</div>

						{task.description ? (
							<p className="text-xs text-gray-600 line-clamp-2">
								{task.description}
							</p>
						) : null}

						{totalCount > 0 && (
							<div className="space-y-1">
								<div className="flex justify-between items-center text-xs">
									<span className="text-gray-600">
										{completedCount} of {totalCount} completed
									</span>
									{isComplete && (
										<span className="flex gap-1 items-center font-medium text-green-600">
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

						<div className="flex justify-between items-center">
							<div className="flex items-center space-x-1 min-w-0 sm:space-x-2">
								{task.assignees && task.assignees.length > 0 && (
									<>
										<UserIcon className="w-4 h-4 shrink-0" />
										<div className="flex items-center gap-1">
											{task.assignees.map((assignee) => (
												<div
													key={assignee.id}
													className="inline-flex justify-center items-center w-6 h-6 text-xs font-semibold text-white bg-indigo-500 rounded-full"
													title={assignee.name || assignee.email || 'User'}>
													{getInitials(assignee.name, assignee.email)}
												</div>
											))}
										</div>
									</>
								)}
							</div>
							<div className="flex items-center space-x-1 sm:space-x-2">
								{task.dueDate && (
									<div className="flex items-center space-x-1 min-w-0 text-xs text-gray-600">
										<Calendar className="w-3 h-3 shrink-0" />
										<span className="truncate">
											{new Date(task.dueDate).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
});
