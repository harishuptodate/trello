import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { boardMemberService } from '@/lib/services';
import { hasBoardAccess, isOrgAdmin } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
const addMemberSchema = z.object({
	userId: z.string(),
	role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;

		const board = await prisma.board.findUnique({
			where: { id },
			select: { id: true, organizationId: true },
		});
		if (!board) {
			return NextResponse.json({ error: 'Board not found' }, { status: 404 });
		}

		const hasAccess = await hasBoardAccess(user.id, id);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const members = await boardMemberService.getBoardMembers(id);
		return NextResponse.json(members);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to fetch board members' },
			{ status: 500 },
		);
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const board = await prisma.board.findUnique({
			where: { id },
			select: { id: true, organizationId: true },
		});
		if (!board) {
			return NextResponse.json({ error: 'Board not found' }, { status: 404 });
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const isAdmin =
			(await isOrgAdmin(user.id, board.organizationId)) ||
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(
				await (prisma as any).boardMember.findUnique({
					where: { boardId_userId: { boardId: id, userId: user.id } },
				})
			)?.role === 'ADMIN';
		if (!isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { userId, role } = addMemberSchema.parse(body);

		const member = await boardMemberService.addMember(id, userId, role);
		return NextResponse.json(member, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to add member' },
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
		const searchParams = new URL(request.url).searchParams;
		const userId = searchParams.get('userId');

		if (!userId) {
			return NextResponse.json(
				{ error: 'userId is required' },
				{ status: 400 },
			);
		}

		const board = await prisma.board.findUnique({
			where: { id },
			select: { id: true, organizationId: true },
		});
		if (!board) {
			return NextResponse.json({ error: 'Board not found' }, { status: 404 });
		}

		const isAdmin =
			(await isOrgAdmin(user.id, board.organizationId)) ||
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(
				await (prisma as any).boardMember.findUnique({
					where: { boardId_userId: { boardId: id, userId: user.id } },
				})
			)?.role === 'ADMIN';
		if (!isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await boardMemberService.removeMember(id, userId);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to remove member' },
			{ status: 500 },
		);
	}
}
