import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { boardDataService } from '@/lib/services';
import { canCreateBoard, hasOrgAccess } from '@/lib/auth-rules';
import { z } from 'zod';

const createBoardSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
	color: z.string().optional(),
	organizationId: z.string(),
	createDefaultColumns: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
	try {
		const user = await requireAuth();
		const { searchParams } = new URL(request.url);
		const orgId = searchParams.get('organizationId');

		if (!orgId) {
			return NextResponse.json(
				{ error: 'organizationId is required' },
				{ status: 400 },
			);
		}

		const hasAccess = await hasOrgAccess(user.id, orgId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const boards = await boardDataService.getBoardsByOrganization(orgId);
		return NextResponse.json(boards);
	} catch (error) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await requireAuth();
		const body = await request.json();
		const data = createBoardSchema.parse(body);

		const canCreate = await canCreateBoard(user.id, data.organizationId);
		if (!canCreate) {
			return NextResponse.json(
				{ error: 'Only admins can create boards' },
				{ status: 403 },
			);
		}

		const board = await boardDataService.createBoardWithDefaultColumns({
			title: data.title,
			description: data.description,
			color: data.color,
			organizationId: data.organizationId,
			createdById: user.id,
			createDefaultColumns: data.createDefaultColumns,
		});

		return NextResponse.json(board, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to create board' },
			{ status: 500 },
		);
	}
}
