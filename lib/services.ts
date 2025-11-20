import { prisma } from './prisma';
import type { Board, Column, Task } from '@prisma/client';

export type BoardWithColumns = Board & {
	columns: (Column & {
		tasks: Task[];
	})[];
};

export type ColumnWithTasks = Column & {
	tasks: (Task & {
		assignee: {
			id: string;
			name: string | null;
			email: string;
			image: string | null;
		} | null;
	})[];
};

export const boardService = {
	async getBoard(boardId: string) {
		const board = await prisma.board.findUnique({
			where: { id: boardId },
			include: {
				organization: true,
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
		if (!board) throw new Error('Board not found');
		return board;
	},

	async getBoardsByOrganization(organizationId: string) {
		return prisma.board.findMany({
			where: { organizationId },
			orderBy: { updatedAt: 'desc' },
			include: {
				createdBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});
	},

	async createBoard(boardData: {
		title: string;
		description?: string;
		color?: string;
		organizationId: string;
		createdById: string;
	}) {
		return prisma.board.create({
			data: {
				title: boardData.title,
				description: boardData.description || null,
				color: boardData.color || 'bg-blue-500',
				organizationId: boardData.organizationId,
				createdById: boardData.createdById,
			},
		});
	},

	async updateBoard(boardId: string, updates: Partial<Board>) {
		return prisma.board.update({
			where: { id: boardId },
			data: updates,
		});
	},

	async deleteBoard(boardId: string) {
		return prisma.board.delete({
			where: { id: boardId },
		});
	},
};

export const columnService = {
	async getColumns(boardId: string) {
		return prisma.column.findMany({
			where: { boardId },
			orderBy: { sortOrder: 'asc' },
		});
	},

	async createColumn(columnData: {
		title: string;
		sortOrder: number;
		boardId: string;
	}) {
		return prisma.column.create({
			data: columnData,
		});
	},

	async updateColumn(columnId: string, updates: Partial<Column>) {
		return prisma.column.update({
			where: { id: columnId },
			data: updates,
		});
	},

	async deleteColumn(columnId: string) {
		return prisma.column.delete({
			where: { id: columnId },
		});
	},
};

export const taskService = {
	async getTasksByBoardId(boardId: string) {
		const columns = await prisma.column.findMany({
			where: { boardId },
			include: {
				tasks: {
					orderBy: { sortOrder: 'asc' },
					include: {
						assignee: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
					},
				},
			},
		});

		return columns.flatMap((col) => col.tasks);
	},

	async createTask(taskData: {
		title: string;
		description?: string;
		assigneeId?: string;
		dueDate?: Date;
		priority: 'LOW' | 'MEDIUM' | 'HIGH';
		checklist?: any;
		sortOrder: number;
		columnId: string;
	}) {
		return prisma.task.create({
			data: {
				title: taskData.title,
				description: taskData.description || null,
				assigneeId: taskData.assigneeId || null,
				dueDate: taskData.dueDate || null,
				priority: taskData.priority,
				checklist: taskData.checklist || null,
				sortOrder: taskData.sortOrder,
				columnId: taskData.columnId,
			},
			include: {
				assignee: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		});
	},

	async moveTask(taskId: string, newColumnId: string, newSortOrder: number) {
		return prisma.task.update({
			where: { id: taskId },
			data: {
				columnId: newColumnId,
				sortOrder: newSortOrder,
			},
		});
	},

	async updateTask(
		taskId: string,
		updates: {
			title?: string;
			description?: string | null;
			assigneeId?: string | null;
			dueDate?: Date | null;
			priority?: 'LOW' | 'MEDIUM' | 'HIGH';
			checklist?: any;
			sortOrder?: number;
			columnId?: string;
		},
	) {
		return prisma.task.update({
			where: { id: taskId },
			data: updates,
			include: {
				assignee: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		});
	},

	async deleteTask(taskId: string) {
		return prisma.task.delete({
			where: { id: taskId },
		});
	},
};

export const boardDataService = {
	async getBoardsByOrganization(organizationId: string) {
		return boardService.getBoardsByOrganization(organizationId);
	},
	async getBoardWithColumns(boardId: string): Promise<BoardWithColumns> {
		const board = await prisma.board.findUnique({
			where: { id: boardId },
			include: {
				columns: {
					orderBy: { sortOrder: 'asc' },
					include: {
						tasks: {
							orderBy: { sortOrder: 'asc' },
							include: {
								assignee: {
									select: {
										id: true,
										name: true,
										email: true,
										image: true,
									},
								},
							},
						},
					},
				},
			},
		});

		if (!board) throw new Error('Board not found');

		return board as BoardWithColumns;
	},

	async createBoardWithDefaultColumns(boardData: {
		title: string;
		description?: string;
		color?: string;
		organizationId: string;
		createdById: string;
		createDefaultColumns?: boolean;
	}) {
		const board = await prisma.board.create({
			data: {
				title: boardData.title,
				description: boardData.description || null,
				color: boardData.color || 'bg-blue-500',
				organizationId: boardData.organizationId,
				createdById: boardData.createdById,
			},
		});

		if (boardData.createDefaultColumns !== false) {
			const defaultColumns = [
				{ title: 'To Do', sortOrder: 0 },
				{ title: 'In Progress', sortOrder: 1 },
				{ title: 'Review', sortOrder: 2 },
				{ title: 'Done', sortOrder: 3 },
			];

			await Promise.all(
				defaultColumns.map((column) =>
					prisma.column.create({
						data: {
							...column,
							boardId: board.id,
						},
					}),
				),
			);
		}

		return board;
	},
};

export const organizationService = {
	async getOrganization(orgId: string) {
		return prisma.organization.findUnique({
			where: { id: orgId },
			include: {
				members: {
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
					},
				},
			},
		});
	},

	async getUserOrganizations(userId: string) {
		return prisma.organizationMember.findMany({
			where: { userId },
			include: {
				organization: {
					include: {
						_count: {
							select: {
								members: true,
								boards: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});
	},

	async createOrganization(data: {
		name: string;
		slug: string;
		userId: string;
	}) {
		return prisma.organization.create({
			data: {
				name: data.name,
				slug: data.slug,
				members: {
					create: {
						userId: data.userId,
						role: 'ADMIN',
					},
				},
			},
		});
	},

	async updateOrganization(
		orgId: string,
		updates: { name?: string; slug?: string },
	) {
		return prisma.organization.update({
			where: { id: orgId },
			data: updates,
		});
	},

	async deleteOrganization(orgId: string) {
		return prisma.organization.delete({
			where: { id: orgId },
		});
	},
};

export const organizationMemberService = {
	async addMember(
		organizationId: string,
		userId: string,
		role: 'ADMIN' | 'MEMBER' = 'MEMBER',
	) {
		return prisma.organizationMember.create({
			data: {
				organizationId,
				userId,
				role,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		});
	},

	async removeMember(organizationId: string, userId: string) {
		return prisma.organizationMember.delete({
			where: {
				organizationId_userId: {
					organizationId,
					userId,
				},
			},
		});
	},

	async updateMemberRole(
		organizationId: string,
		userId: string,
		role: 'ADMIN' | 'MEMBER',
	) {
		return prisma.organizationMember.update({
			where: {
				organizationId_userId: {
					organizationId,
					userId,
				},
			},
			data: { role },
		});
	},

	async getOrganizationMembers(organizationId: string) {
		return prisma.organizationMember.findMany({
			where: { organizationId },
			include: {
				user: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		});
	},
};
