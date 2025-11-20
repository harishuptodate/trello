import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { organizationService } from '@/lib/services';
import { hasOrgAccess, isOrgAdmin } from '@/lib/auth-rules';

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const user = await requireAuth();
		const org = await organizationService.getOrganization(params.id);

		if (!org) {
			return NextResponse.json(
				{ error: 'Organization not found' },
				{ status: 404 },
			);
		}

		const hasAccess = await hasOrgAccess(user.id, params.id);
		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		return NextResponse.json(org);
	} catch (error) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
}

export async function PUT(
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
		const org = await organizationService.updateOrganization(params.id, body);

		return NextResponse.json(org);
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to update organization' },
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

		await organizationService.deleteOrganization(params.id);
		return NextResponse.json({ success: true });
	} catch (error) {
		return NextResponse.json(
			{ error: 'Failed to delete organization' },
			{ status: 500 },
		);
	}
}
