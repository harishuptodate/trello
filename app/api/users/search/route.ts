import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
	try {
		await requireAuth();
		const { searchParams } = new URL(request.url);
		const query = searchParams.get('q');

		if (!query || query.trim().length < 2) {
			return NextResponse.json({ users: [] });
		}

		const users = await prisma.user.findMany({
			where: {
				OR: [
					{ email: { contains: query, mode: 'insensitive' } },
					{ name: { contains: query, mode: 'insensitive' } },
				],
			},
			select: {
				id: true,
				email: true,
				name: true,
				image: true,
			},
			take: 10,
		});

		return NextResponse.json({ users });
	} catch (error) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
}
