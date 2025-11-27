import { prisma } from './prisma';
import type { Board, Column, Task } from '@prisma/client';

export type BoardWithColumns = Board & {
	columns: (Column & {
		tasks: TaskWithAssignees[];
	})[];
};

export type ColumnWithTasks = Column & {
	tasks: TaskWithAssignees[];
};

export type TaskWithAssignees = Task & {
	assignees: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	}[];
	comments?: {
		id: string;
		content: string;
		userId: string;
		createdAt: Date;
		updatedAt: Date;
	}[];
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
				members: true,
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
						assignees: {
							select: {
								id: true,
								name: true,
								email: true,
								image: true,
							},
						},
						comments: true,
					},
				},
			},
		});

		return columns.flatMap((col) => col.tasks);
	},

	async createTask(taskData: {
		title: string;
		description?: string;
		assigneeIds?: string[];
		dueDate?: Date;
		priority: 'LOW' | 'MEDIUM' | 'HIGH';
		checklist?: any;
		sortOrder: number;
		columnId: string;
	}) {
		const column = await prisma.column.findUnique({
			where: { id: taskData.columnId },
			select: {
				boardId: true,
				board: {
					select: { organizationId: true },
				},
			},
		});

		if (!column) {
			throw new Error('Column not found');
		}

		const task = await prisma.task.create({
			data: {
				title: taskData.title,
				description: taskData.description || null,
				dueDate: taskData.dueDate || null,
				priority: taskData.priority,
				checklist: taskData.checklist || null,
				sortOrder: taskData.sortOrder,
				columnId: taskData.columnId,
			},
			include: {
				assignees: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
			},
		});

		// Connect assignees if provided
		if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
			await prisma.$transaction([
				// Ensure assignees are board members
				...taskData.assigneeIds.map((id) =>
					prisma.boardMember.upsert({
						where: {
							boardId_userId: { boardId: column.boardId, userId: id },
						},
						update: {},
						create: { boardId: column.boardId, userId: id },
					}),
				),
				// Ensure assignees are org members
				...(column.board?.organizationId
					? taskData.assigneeIds.map((id) =>
							prisma.organizationMember.upsert({
								where: {
									organizationId_userId: {
										organizationId: column.board!.organizationId,
										userId: id,
									},
								},
								update: {},
								create: {
									organizationId: column.board!.organizationId,
									userId: id,
									role: 'MEMBER',
								},
							}),
					  )
					: []),
				prisma.task.update({
					where: { id: task.id },
					data: {
						assignees: {
							set: [],
							connect: taskData.assigneeIds.map((id) => ({ id })),
						},
					},
				}),
			]);
		}

		return prisma.task.findUnique({
			where: { id: task.id },
			include: {
				assignees: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				comments: true,
			},
		});
	},

	async moveTask(taskId: string, newColumnId: string, newSortOrder: number) {
		// Get the task being moved
		const task = await prisma.task.findUnique({
			where: { id: taskId },
		});

		if (!task) {
			throw new Error('Task not found');
		}

		const oldColumnId = task.columnId;
		const isSameColumn = oldColumnId === newColumnId;

		if (isSameColumn) {
			// Reordering within the same column
			// Get all tasks in the column, ordered by sortOrder
			const allTasks = await prisma.task.findMany({
				where: { columnId: oldColumnId },
				orderBy: { sortOrder: 'asc' },
			});

			const oldIndex = allTasks.findIndex((t) => t.id === taskId);
			if (oldIndex === -1) {
				throw new Error('Task not found in column');
			}

			// Remove the task from its current position
			const reorderedTasks = allTasks.filter((t) => t.id !== taskId);
			// Insert it at the new position
			reorderedTasks.splice(newSortOrder, 0, task);

			// Update sortOrder for all tasks in the column
			await prisma.$transaction(
				reorderedTasks.map((t, index) =>
					prisma.task.update({
						where: { id: t.id },
						data: { sortOrder: index },
					}),
				),
			);
		} else {
			// Moving to a different column
			// Get all tasks in both columns
			const [oldColumnTasks, newColumnTasks] = await Promise.all([
				prisma.task.findMany({
					where: { columnId: oldColumnId },
					orderBy: { sortOrder: 'asc' },
				}),
				prisma.task.findMany({
					where: { columnId: newColumnId },
					orderBy: { sortOrder: 'asc' },
				}),
			]);

			// Remove the moved task from old column
			const updatedOldColumnTasks = oldColumnTasks.filter(
				(t) => t.id !== taskId,
			);

			// Insert task into new column at the specified position
			const updatedNewColumnTasks = [...newColumnTasks];
			updatedNewColumnTasks.splice(newSortOrder, 0, task);

			// Prepare update operations
			const updates = [
				// Update old column tasks (reorder after removing the moved task)
				...updatedOldColumnTasks.map((t, index) =>
					prisma.task.update({
						where: { id: t.id },
						data: { sortOrder: index },
					}),
				),
				// Update new column tasks (including the moved task)
				...updatedNewColumnTasks.map((t, index) =>
					prisma.task.update({
						where: { id: t.id },
						data: {
							columnId: newColumnId,
							sortOrder: index,
						},
					}),
				),
			];

			await prisma.$transaction(updates);
		}

		return prisma.task.findUnique({
			where: { id: taskId },
		});
	},

	async updateTask(
		taskId: string,
		updates: {
			title?: string;
			description?: string | null;
			assigneeIds?: string[] | null;
			dueDate?: Date | null;
			priority?: 'LOW' | 'MEDIUM' | 'HIGH';
			checklist?: any;
			sortOrder?: number;
			columnId?: string;
		},
	) {
		let boardId: string | null = null;
		let organizationId: string | null = null;
		if (updates.assigneeIds !== undefined || updates.columnId) {
			const task = await prisma.task.findUnique({
				where: { id: taskId },
				include: {
					column: {
						select: {
							boardId: true,
							board: {
								select: { organizationId: true },
							},
						},
					},
				},
			});
			boardId = task?.column.boardId ?? null;
			organizationId = task?.column.board.organizationId ?? null;
		}

		const { assigneeIds, ...rest } = updates;
		const updated = await prisma.task.update({
			where: { id: taskId },
			data: {
				...rest,
				...(assigneeIds !== undefined
					? {
							assignees: {
								set: [],
								...(assigneeIds
									? { connect: assigneeIds.map((id) => ({ id })) }
									: {}),
							},
					  }
					: {}),
			},
			include: {
				assignees: {
					select: {
						id: true,
						name: true,
						email: true,
						image: true,
					},
				},
				comments: true,
			},
		});

		if (boardId && assigneeIds && assigneeIds.length > 0) {
			await prisma.$transaction([
				...assigneeIds.map((id) =>
					prisma.boardMember.upsert({
						where: { boardId_userId: { boardId, userId: id } },
						update: {},
						create: { boardId, userId: id },
					}),
				),
				...(organizationId
					? assigneeIds.map((id) =>
							prisma.organizationMember.upsert({
								where: {
									organizationId_userId: { organizationId, userId: id },
								},
								update: {},
								create: {
									organizationId,
									userId: id,
									role: 'MEMBER',
								},
							}),
					  )
					: []),
			]);
		}

		return updated;
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
								assignees: {
									select: {
										id: true,
										name: true,
										email: true,
										image: true,
									},
								},
								comments: true,
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

export const boardMemberService = {
	async addMember(
		boardId: string,
		userId: string,
		role: 'ADMIN' | 'MEMBER' = 'MEMBER',
	) {
		return prisma.boardMember.upsert({
			where: {
				boardId_userId: {
					boardId,
					userId,
				},
			},
			update: { role },
			create: { boardId, userId, role },
		});
	},

	async removeMember(boardId: string, userId: string) {
		return prisma.boardMember.delete({
			where: {
				boardId_userId: { boardId, userId },
			},
		});
	},

	async getBoardMembers(boardId: string) {
		return prisma.boardMember.findMany({
			where: { boardId },
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

export const taskCommentService = {
	async createComment(taskId: string, userId: string, content: string) {
		return prisma.taskComment.create({
			data: {
				taskId,
				userId,
				content,
			},
		});
	},

	async updateComment(commentId: string, userId: string, content: string) {
		const existing = await prisma.taskComment.findUnique({
			where: { id: commentId },
		});
		if (!existing || existing.userId !== userId) {
			throw new Error('Forbidden');
		}
		return prisma.taskComment.update({
			where: { id: commentId },
			data: { content },
		});
	},

	async deleteComment(commentId: string, userId: string) {
		const existing = await prisma.taskComment.findUnique({
			where: { id: commentId },
		});
		if (!existing || existing.userId !== userId) {
			throw new Error('Forbidden');
		}
		return prisma.taskComment.delete({
			where: { id: commentId },
		});
	},

	async getTaskComments(taskId: string) {
		return prisma.taskComment.findMany({
			where: { taskId },
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
			orderBy: { createdAt: 'asc' },
		});
	},
};
