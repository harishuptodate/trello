import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskService } from '@/lib/services';
import { hasBoardAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const rawBody = await request.json();
		const body = {
			...rawBody,
			description: rawBody.description ?? undefined,
			// normalize UI payloads that send assignees objects instead of ids
			assigneeIds: Array.isArray(rawBody.assigneeIds)
				? rawBody.assigneeIds
				: Array.isArray(rawBody.assignees)
					? rawBody.assignees
							.map((a: { id?: string }) => a?.id)
							.filter(Boolean)
					: undefined,
		};

		// Get task to find board
		const task = await prisma.task.findUnique({
			where: { id: id },
			include: {
				column: {
					include: {
						board: {
							select: { id: true, organizationId: true },
						},
					},
				},
			},
		});

		if (!task) {
			return NextResponse.json({ error: 'Task not found' }, { status: 404 });
		}

		// Verify user has access to the organization
		const hasAccess = await hasBoardAccess(user.id, task.column.board.id);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// If assigneeIds is being updated, verify users exist (board membership handled in service)
		if (body.assigneeIds !== undefined && body.assigneeIds.length > 0) {
			const users = await prisma.user.findMany({
				where: { id: { in: body.assigneeIds } },
				select: { id: true },
			});
			const userIds = new Set(users.map((u) => u.id));
			const invalid = body.assigneeIds.filter((id: string) => !userIds.has(id));
			if (invalid.length > 0) {
				return NextResponse.json(
					{ error: 'Assignee must be a valid user' },
					{ status: 400 },
				);
			}
		}

		const updatedTask = await taskService.updateTask(id, {
			...body,
			dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
		});

		return NextResponse.json(updatedTask);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to update task' },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
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

	// Verify user has access to the organization
	const hasAccess = await hasBoardAccess(user.id, task.column.boardId);
	if (!hasAccess) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

		await taskService.deleteTask(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to delete task' },
			{ status: 500 },
		);
	}
}
