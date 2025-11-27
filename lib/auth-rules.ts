import { prisma } from './prisma';

export async function isBoardMember(userId: string, boardId: string) {
	const member = await prisma.boardMember.findUnique({
		where: {
			boardId_userId: {
				boardId,
				userId,
			},
		},
	});
	return !!member;
}

export async function hasBoardAccess(userId: string, boardId: string) {
	const board = await prisma.board.findUnique({
		where: { id: boardId },
		select: { organizationId: true },
	});

	if (!board) return false;

	const [orgAdmin, boardMember] = await Promise.all([
		isOrgAdmin(userId, board.organizationId),
		isBoardMember(userId, boardId),
	]);

	return orgAdmin || boardMember;
}

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
