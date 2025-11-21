import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { boardService } from '@/lib/services';
import { hasOrgAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const board = await boardService.getBoard(id);

		const hasAccess = await hasOrgAccess(user.id, board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		return NextResponse.json(board);
	} catch (error) {
		return NextResponse.json({ error: 'Board not found' }, { status: 404 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
			const { id } = await params;
		const board = await boardService.getBoard(id);

		const hasAccess = await hasOrgAccess(user.id, board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const updatedBoard = await boardService.updateBoard(id, body);

		return NextResponse.json(updatedBoard);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to update board' },
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
		const board = await boardService.getBoard(id);

		const hasAccess = await hasOrgAccess(user.id, board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await boardService.deleteBoard(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to delete board' },
			{ status: 500 },
		);
	}
}
