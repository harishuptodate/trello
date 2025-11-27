import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

export async function PATCH(request: NextRequest) {
	try {
		const user = await requireAuth();
		const { name } = await request.json();
		console.log('name', name);
		const trimmedName = (name as string | undefined)?.trim();

		if (!trimmedName) {
			return NextResponse.json(
				{ error: 'Name is required' },
				{ status: 400 },
			);
		}

		const updatedUser = await prisma.user.update({
			where: { id: user.id },
			data: { name: trimmedName },
			select: {
				id: true,
				name: true,
				email: true,
			},
		});

		return NextResponse.json({ user: updatedUser });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unable to update user';

		if (message === 'Unauthorized') {
			return NextResponse.json({ error: message }, { status: 401 });
		}

		return NextResponse.json({ error: message }, { status: 500 });
	}
}
