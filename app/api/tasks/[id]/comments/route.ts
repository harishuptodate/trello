import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { hasBoardAccess, isBoardMember, isOrgAdmin } from '@/lib/auth-rules';
import { taskCommentService } from '@/lib/services';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCommentSchema = z.object({
	content: z.string().min(1).max(5000),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;

		const task = await prisma.task.findUnique({
			where: { id },
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

		const hasAccess = await hasBoardAccess(user.id, task.column.board.id);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const comments = await taskCommentService.getTaskComments(id);
		return NextResponse.json(comments);
	} catch (error) {
		return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const task = await prisma.task.findUnique({
			where: { id },
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

		const hasAccess = await hasBoardAccess(user.id, task.column.board.id);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { content } = createCommentSchema.parse(body);

		const comment = await taskCommentService.createComment(
			id,
			user.id,
			content,
		);

		return NextResponse.json(comment, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to create comment' },
			{ status: 500 },
		);
	}
}
