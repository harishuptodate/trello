import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { columnService } from '@/lib/services';
import { hasBoardAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createColumnSchema = z.object({
	title: z.string().min(1).max(200),
	sortOrder: z.number().default(0),
	boardId: z.string(),
});

export async function POST(request: NextRequest) {
	try {
		const user = await requireAuth();
		const body = await request.json();
		const data = createColumnSchema.parse(body);

		// Get board to verify access
		const board = await prisma.board.findUnique({
			where: { id: data.boardId },
		});

		if (!board) {
			return NextResponse.json({ error: 'Board not found' }, { status: 404 });
		}

		// Verify user has access to the board
		const hasAccess = await hasBoardAccess(user.id, board.id);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const column = await columnService.createColumn(data);
		return NextResponse.json(column, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to create column' },
			{ status: 500 },
		);
	}
}
