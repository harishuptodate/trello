import { prisma } from './prisma';

export async function isOrgAdmin(
	userId: string,
	orgId: string,
): Promise<boolean> {
	const member = await prisma.organizationMember.findUnique({
		where: {
			organizationId_userId: {
				organizationId: orgId,
				userId: userId,
			},
		},
	});

	return member?.role === 'ADMIN';
}

export async function canCreateBoard(
	userId: string,
	orgId: string,
): Promise<boolean> {
	return isOrgAdmin(userId, orgId);
}

export async function hasOrgAccess(
	userId: string,
	orgId: string,
): Promise<boolean> {
	const member = await prisma.organizationMember.findFirst({
		where: {
			organizationId: orgId,
			userId: userId,
		},
	});

	return !!member;
}

export async function getOrgMembers(orgId: string) {
	return prisma.organizationMember.findMany({
		where: {
			organizationId: orgId,
		},
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
		},
	});
}
