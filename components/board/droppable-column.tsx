'use client';

import { memo, type ReactNode, useCallback, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { DialogTitle, DialogTrigger } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { InlineEdit } from '@/components/ui/inline-edit';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { ColumnWithTasks } from '@/lib/services';
import type { TaskData } from './task-form';
import { TaskForm } from './task-form';

type DroppableColumnProps = {
	column: ColumnWithTasks;
	children: ReactNode;
	onCreateTask: (columnId: string, taskData: TaskData) => Promise<void>;
	onInlineSaveColumn: (columnId: string, title: string) => Promise<void>;
	inlineSavingColumnId: string | null;
	onDeleteColumn?: (columnId: string) => Promise<void>;
};

// memoized to prevent rerender when sibling columns update
export const DroppableColumn = memo(function DroppableColumn({
	column,
	children,
	onCreateTask,
	onInlineSaveColumn,
	inlineSavingColumnId,
	onDeleteColumn,
}: DroppableColumnProps) {
	const { setNodeRef, isOver } = useDroppable({ id: column.id });
	const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDeleteColumn = useCallback(async () => {
		if (!onDeleteColumn) return;
		setIsDeleting(true);
		try {
			await onDeleteColumn(column.id);
			setIsDeleteDialogOpen(false);
		} catch (err) {
			console.error('Failed to delete column:', err);
		} finally {
			setIsDeleting(false);
		}
	}, [onDeleteColumn, column.id]);

	return (
		<div
			ref={setNodeRef}
			className={`w-full lg:shrink-0 lg:w-80 ${
				isOver ? 'bg-blue-50' : ''
			}`}>
			<div
				className={`bg-white rounded-lg shadow-sm border flex flex-col ${
					isOver ? 'ring-2 ring-blue-300' : ''
				}`}>
				<div className="shrink-0 p-3 border-b sm:p-4 group">
					<div className="flex items-center justify-between gap-2">
						<div className="flex-1 min-w-0 flex items-center gap-2">
							<InlineEdit
								value={column.title}
								placeholder="Edit column title..."
								onSave={(val) => onInlineSaveColumn(column.id, val)}
								saving={inlineSavingColumnId === column.id}
								className="flex-1 min-w-0"
							/>
							{onDeleteColumn && (
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
									onClick={(e) => {
										e.stopPropagation();
										setIsDeleteDialogOpen(true);
									}}>
									<Trash2 className="w-4 h-4" />
								</Button>
							)}
						</div>
						<Badge variant="secondary" className="shrink-0 text-xs">
							{column.tasks.length}
						</Badge>
					</div>
				</div>

				<div className="flex flex-col p-2">
					<div className="w-full">{children}</div>
					<Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
						<DialogTrigger asChild>
							<Button
								variant="secondary"
								className="shrink-0 mt-3 w-full text-gray-500 hover:text-gray-700">
								<Plus />
								Add Task
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] overflow-y-auto">
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
								onClose={() => setIsCreateTaskOpen(false)}
							/>
						</DialogContent>
					</Dialog>
					{onDeleteColumn && (
						<Dialog
							open={isDeleteDialogOpen}
							onOpenChange={setIsDeleteDialogOpen}>
							<DialogContent className="max-w-md">
								<DialogHeader>
									<DialogTitle>Delete Column</DialogTitle>
									<p className="text-sm text-gray-600">
										Are you sure you want to delete "{column.title}"? This will
										permanently delete the column and all its tasks. This action
										cannot be undone.
									</p>
								</DialogHeader>
								<div className="flex justify-end gap-2 mt-4">
									<Button
										variant="outline"
										onClick={() => setIsDeleteDialogOpen(false)}
										disabled={isDeleting}>
										Cancel
									</Button>
									<Button
										variant="destructive"
										onClick={handleDeleteColumn}
										disabled={isDeleting}>
										{isDeleting ? (
											<>
												<Loader2 className="mr-2 w-4 h-4 animate-spin" />
												Deleting...
											</>
										) : (
											'Delete Column'
										)}
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					)}
				</div>
			</div>
		</div>
	);
});
