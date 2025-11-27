import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskService } from '@/lib/services';
import { hasBoardAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const moveTaskSchema = z.object({
	newColumnId: z.string(),
	newSortOrder: z.number(),
});

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const body = await request.json();
		const { newColumnId, newSortOrder } = moveTaskSchema.parse(body);

		// Get task to find board
		const task = await prisma.task.findUnique({
			where: { id: id },
			include: {
				column: {
					include: {
						board: true,
					},
				},
			},
	});

	if (!task) {
		return NextResponse.json({ error: 'Task not found' }, { status: 404 });
	}

		// Get new column to verify it's in the same board
		const newColumn = await prisma.column.findUnique({
			where: { id: newColumnId },
			include: {
				board: true,
			},
		});

		if (!newColumn) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		if (task.column.boardId !== newColumn.boardId) {
			return NextResponse.json(
				{ error: 'Cannot move task to a different board' },
				{ status: 400 },
			);
	}

	// Verify user has access to the organization
	const hasAccess = await hasBoardAccess(user.id, task.column.boardId);
	if (!hasAccess) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

		await taskService.moveTask(id, newColumnId, newSortOrder);
		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json({ error: 'Failed to move task' }, { status: 500 });
	}
}
