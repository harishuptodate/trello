'use client';

import {
	TaskDialog,
	TaskDialogData,
	TaskDialogTask,
} from '@/components/task-dialog';

export type TaskData = TaskDialogData;

type TaskFormProps = {
	columnId: string;
	boardId: string;
	task?: TaskDialogTask | null;
	onCreateTask?: (columnId: string, taskData: TaskData) => Promise<void>;
	onUpdateTask?: (taskId: string, taskData: TaskData) => Promise<void>;
	onClose: () => void;
};

export function TaskForm({
	columnId,
	boardId,
	task,
	onCreateTask,
	onUpdateTask,
	onClose,
}: TaskFormProps) {
	return (
		<TaskDialog
			columnId={columnId}
			boardId={boardId}
			task={task}
			onCreateTask={onCreateTask}
			onUpdateTask={onUpdateTask}
			onClose={onClose}
		/>
	);
}
