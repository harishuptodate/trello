import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const boardMemberKey = (boardId: string) => ['board-members', boardId] as const;

export function useBoardMembers(boardId: string) {
	return useQuery({
		enabled: !!boardId,
		queryKey: boardMemberKey(boardId),
		queryFn: async () => {
			const res = await fetch(`/api/boards/${boardId}/members`);
			if (!res.ok) throw new Error('Failed to fetch board members');
			return res.json();
		},
	});
}

export function useAddBoardMember(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: { userId: string; role?: 'ADMIN' | 'MEMBER' }) => {
			const res = await fetch(`/api/boards/${boardId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) throw new Error('Failed to add member');
			return res.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: boardMemberKey(boardId),
			}),
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useRemoveBoardMember(boardId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (userId: string) => {
			const res = await fetch(
				`/api/boards/${boardId}/members?userId=${encodeURIComponent(userId)}`,
				{ method: 'DELETE' },
			);
			if (!res.ok) throw new Error('Failed to remove member');
			return userId;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: boardMemberKey(boardId),
			}),
		onError: (err: Error) => toast.error(err.message),
	});
}
