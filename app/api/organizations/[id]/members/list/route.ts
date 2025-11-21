import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { getOrgMembers } from '@/lib/auth-rules';
import { hasOrgAccess } from '@/lib/auth-rules';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireAuth();
		const { id } = await params;
		const hasAccess = await hasOrgAccess(user.id, id);

		if (!hasAccess) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const members = await getOrgMembers(id);
		return NextResponse.json(members);
	} catch (error) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}
}
