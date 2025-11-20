import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { organizationService } from '@/lib/services';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createOrgSchema = z.object({
	name: z.string().min(1).max(100),
	slug: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-z0-9-]+$/),
});

export async function GET(request: NextRequest) {
	try {
		const user = await requireAuth();
		const orgs = await organizationService.getUserOrganizations(user.id);
		return NextResponse.json(orgs);
	} catch (error) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await requireAuth();
		const body = await request.json();
		const data = createOrgSchema.parse(body);

		// Check if slug already exists
		const existing = await prisma.organization.findUnique({
			where: { slug: data.slug },
		});
		if (existing) {
			return NextResponse.json(
				{ error: 'Slug already exists' },
				{ status: 400 },
			);
		}

		const org = await organizationService.createOrganization({
			name: data.name,
			slug: data.slug,
			userId: user.id,
		});

		return NextResponse.json(org, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to create organization' },
			{ status: 500 },
		);
	}
}
