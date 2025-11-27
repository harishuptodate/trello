import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { hasBoardAccess, isBoardMember, isOrgAdmin } from '@/lib/auth-rules';
import { taskCommentService } from '@/lib/services';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateCommentSchema = z.object({
	content: z.string().min(1).max(5000),
});

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; commentId: string }> },
) {
	try {
		const user = await requireAuth();
		const { id, commentId } = await params;

		const comment = await prisma.taskComment.findUnique({
			where: { id: commentId },
			include: {
				task: {
					include: {
						column: {
							include: { board: { select: { id: true, organizationId: true } } },
						},
					},
				},
			},
		});

		if (!comment || comment.taskId !== id) {
			return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
		}

		const hasAccess = await hasBoardAccess(user.id, comment.task.column.board.id);
		if (!hasAccess || comment.userId !== user.id) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { content } = updateCommentSchema.parse(body);

		const updated = await taskCommentService.updateComment(
			commentId,
			user.id,
			content,
		);
		return NextResponse.json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to update comment' },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; commentId: string }> },
) {
	try {
		const user = await requireAuth();
		const { id, commentId } = await params;

		const comment = await prisma.taskComment.findUnique({
			where: { id: commentId },
			include: {
				task: {
					include: {
						column: {
							include: { board: { select: { id: true, organizationId: true } } },
						},
					},
				},
			},
		});

		if (!comment || comment.taskId !== id) {
			return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
		}

		const boardId = comment.task.column.board.id;
		const hasAccess = await hasBoardAccess(user.id, boardId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Author or board/org admin can delete
		const isAuthor = comment.userId === user.id;
		const [boardMember, orgAdmin] = await Promise.all([
			prisma.boardMember.findUnique({
				where: { boardId_userId: { boardId, userId: user.id } },
			}),
			isOrgAdmin(user.id, comment.task.column.board.organizationId),
		]);

		const isAdmin = orgAdmin || boardMember?.role === 'ADMIN';

		if (!isAuthor && !isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await taskCommentService.deleteComment(commentId, comment.userId);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to delete comment' },
			{ status: 500 },
		);
	}
}
