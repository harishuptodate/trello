import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { organizationMemberService } from '@/lib/services';
import { isOrgAdmin, getOrgMembers } from '@/lib/auth-rules';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const addMemberSchema = z.object({
	email: z.string().email(),
	role: z.enum(['ADMIN', 'MEMBER']).optional().default('MEMBER'),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const hasAccess = await isOrgAdmin(user.id, params.id);

		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const members = await getOrgMembers(params.id);
		return NextResponse.json(members);
	} catch (error) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const isAdmin = await isOrgAdmin(user.id, params.id);

		if (!isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const { email, role } = addMemberSchema.parse(body);

		// Find user by email
		const targetUser = await prisma.user.findUnique({
			where: { email },
		});

		if (!targetUser) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Check if user is already a member
		const existingMember = await prisma.organizationMember.findUnique({
			where: {
				organizationId_userId: {
					organizationId: params.id,
					userId: targetUser.id,
				},
			},
		});

		if (existingMember) {
			return NextResponse.json(
				{ error: 'User is already a member' },
				{ status: 400 },
			);
		}

		const member = await organizationMemberService.addMember(
			params.id,
			targetUser.id,
			role,
		);
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
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const isAdmin = await isOrgAdmin(user.id, params.id);

		if (!isAdmin) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return NextResponse.json(
				{ error: 'userId is required' },
				{ status: 400 },
			);
		}

		await organizationMemberService.removeMember(params.id, userId);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to remove member' },
			{ status: 500 },
		);
	}
}
