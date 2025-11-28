'use client';

import { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import type { TaskWithAssignees } from '@/lib/services';

type TaskOverlayProps = {
	task: TaskWithAssignees;
};

export const TaskOverlay = memo(function TaskOverlay({ task }: TaskOverlayProps) {
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

	return (
		<Card className="transition-shadow cursor-pointer hover:shadow-md">
			<CardContent>
				<div className="space-y-1 sm:space-y-2">
					<div className="flex justify-between items-start">
						<h4 className="flex-1 pr-2 min-w-0 text-sm font-medium leading-tight text-gray-900">
							{task.title}
						</h4>
					</div>

					{task.description ? (
						<p className="text-xs text-gray-600 line-clamp-2">
							{task.description}
						</p>
					) : null}
					<div className="flex justify-between items-center">
						<div className="flex items-center space-x-1 min-w-0 sm:space-x-2">
							{task.assignees && task.assignees.length > 0 && (
								<div className="flex items-center gap-1">
									{task.assignees.map((assignee) => (
										<div
											key={assignee.id}
											className="inline-flex justify-center items-center w-6 h-6 text-xs font-semibold text-white bg-blue-500 rounded-full"
											title={assignee.name || assignee.email || 'User'}>
											{getInitials(assignee.name, assignee.email)}
										</div>
									))}
								</div>
							)}
							{task.dueDate && (
								<div className="flex items-center space-x-1 min-w-0 text-xs text-gray-600">
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
	);
});
