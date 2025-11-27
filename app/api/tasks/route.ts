import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskService } from '@/lib/services';
import { hasBoardAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTaskSchema = z.object({
	title: z.string().min(1).max(500),
	description: z.string().nullable().optional(),
	assigneeIds: z.array(z.string()).optional(),
	dueDate: z.string().optional(),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
	checklist: z.any().optional(),
	sortOrder: z.number().default(0),
	columnId: z.string(),
});

export async function POST(request: NextRequest) {
	try {
		const user = await requireAuth();
		const raw = await request.json();
		const normalized = {
			...raw,
			description: raw.description ?? undefined,
			assigneeIds: Array.isArray(raw.assigneeIds)
				? raw.assigneeIds
				: Array.isArray(raw.assignees)
					? raw.assignees
							.map((a: { id?: string }) => a?.id)
							.filter(Boolean)
					: undefined,
		};
		const data = createTaskSchema.parse(normalized);

		// Get column to find board
		const column = await prisma.column.findUnique({
			where: { id: data.columnId },
			include: {
				board: true,
			},
		});

		if (!column) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		// Verify user has access to the board (org member or explicit board member)
		const hasAccess = await hasBoardAccess(user.id, column.boardId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden', details: 'You do not have access to operate on this board' }, { status: 403 });
		}

		// If assignees provided, ensure they exist (they'll be added as board members in service)
		if (data.assigneeIds && data.assigneeIds.length > 0) {
			const users = await prisma.user.findMany({
				where: { id: { in: data.assigneeIds } },
				select: { id: true },
			});
			const userIds = new Set(users.map((u) => u.id));
			const invalid = data.assigneeIds.filter((id) => !userIds.has(id));
			if (invalid.length > 0) {
				return NextResponse.json(
					{ error: 'Assignee must be a valid user' },
					{ status: 400 },
				);
			}
		}

		const task = await taskService.createTask({
			...data,
			description: data.description ?? undefined,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
		});

		return NextResponse.json(task, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to create task' },
			{ status: 500 },
		);
	}
}
