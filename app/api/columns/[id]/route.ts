import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { columnService } from '@/lib/services';
import { hasOrgAccess } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const column = await prisma.column.findUnique({
			where: { id: params.id },
			include: {
				board: true,
			},
		});

		if (!column) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		// Verify user has access to the organization
		const hasAccess = await hasOrgAccess(user.id, column.board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		return NextResponse.json(column);
	} catch (error) {
		return NextResponse.json({ error: 'Column not found' }, { status: 404 });
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const body = await request.json();

		// Get column to find board
		const column = await prisma.column.findUnique({
			where: { id: params.id },
			include: {
				board: true,
			},
		});

		if (!column) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		// Verify user has access to the organization
		const hasAccess = await hasOrgAccess(user.id, column.board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const updatedColumn = await columnService.updateColumn(params.id, body);
		return NextResponse.json(updatedColumn);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to update column' },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();

		// Get column to find board
		const column = await prisma.column.findUnique({
			where: { id: params.id },
			include: {
				board: true,
			},
		});

		if (!column) {
			return NextResponse.json({ error: 'Column not found' }, { status: 404 });
		}

		// Verify user has access to the organization
		const hasAccess = await hasOrgAccess(user.id, column.board.organizationId);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		await columnService.deleteColumn(params.id);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to delete column' },
			{ status: 500 },
		);
	}
}
