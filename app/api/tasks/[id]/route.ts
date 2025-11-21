import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { taskService, columnService } from '@/lib/services';
import { hasOrgAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const body = await request.json();

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
		const hasAccess = await hasOrgAccess(
			user.id,
			task.column.board.organizationId,
		);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// If assigneeId is being updated, verify they're in the same organization
		if (body.assigneeId !== undefined) {
			if (body.assigneeId) {
				const assigneeMember = await prisma.organizationMember.findFirst({
					where: {
						organizationId: task.column.board.organizationId,
						userId: body.assigneeId,
					},
				});

				if (!assigneeMember) {
					return NextResponse.json(
						{ error: 'Assignee must be a member of the organization' },
						{ status: 400 },
					);
				}
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
		const hasAccess = await hasOrgAccess(
			user.id,
			task.column.board.organizationId,
		);
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
