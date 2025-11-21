/* export type Board = {
	id: string;
	title: string;
	description: string | null;
	color: string;
	user_id: string;
	created_at: string;
	updated_at: string;
};

export type Column = {
	id: string;
	title: string;
	sort_order: number;
	board_id: string;
	user_id: string;
	created_at: string;
};

export type Task = {
	id: string;
	column_id: string;
	title: string;
	description: string | null;
	assignee: string | null;
	due_date: string | null;
	priority: 'low' | 'medium' | 'high';
	checklist: { item: string; completed: boolean }[] | null; // how to put this in supabase schema ? ans
	sort_order: number;
	created_at: string;
};

export type ColumnWithTasks = Column & { tasks: Task[] };
*/