import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskService, columnService } from '@/lib/services';
import { hasOrgAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTaskSchema = z.object({
	title: z.string().min(1).max(500),
	description: z.string().optional(),
	assigneeId: z.string().optional(),
	dueDate: z.string().optional(),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
	checklist: z.any().optional(),
	sortOrder: z.number().default(0),
	columnId: z.string(),
});

export async function POST(request: NextRequest) {
	try {
		const user = await requireAuth();
		const body = await request.json();
		const data = createTaskSchema.parse(body);

		// Get column to find board
		const column = await columnService.getColumns(data.columnId);
		if (!column || column.length === 0) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		const firstColumn = await prisma.column.findUnique({
			where: { id: data.columnId },
			include: { board: true },
		});

		if (!firstColumn) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		// Verify user has access to the organization
		const hasAccess = await hasOrgAccess(
			user.id,
			firstColumn.board.organizationId,
		);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// If assigneeId is provided, verify they're in the same organization
		if (data.assigneeId) {
			const assigneeMember = await prisma.organizationMember.findFirst({
				where: {
					organizationId: firstColumn.board.organizationId,
					userId: data.assigneeId,
				},
			});

			if (!assigneeMember) {
				return NextResponse.json(
					{ error: 'Assignee must be a member of the organization' },
					{ status: 400 },
				);
			}
		}

		const task = await taskService.createTask({
			...data,
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
