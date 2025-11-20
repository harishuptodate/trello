import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { boardDataService } from '@/lib/services';
import { hasOrgAccess } from '@/lib/auth-rules';

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const board = await boardDataService.getBoardWithColumns(params.id);

		const hasAccess = await hasOrgAccess(user.id, board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		return NextResponse.json(board);
	} catch (error) {
		return NextResponse.json({ error: 'Board not found' }, { status: 404 });
	}
}
