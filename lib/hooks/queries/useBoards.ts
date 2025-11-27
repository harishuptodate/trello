import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Board } from '@prisma/client';

export type BoardType = Board & {
	createdBy: {
		id: string;
		name: string | null;
		email: string;
	};
};

const boardKeys = {
	all: (orgId?: string | null) => ['boards', orgId] as const,
};

export function useBoards(orgId?: string | null) {
	return useQuery({
		enabled: !!orgId,
		queryKey: boardKeys.all(orgId ?? ''),
		queryFn: async () => {
			const res = await fetch(`/api/boards?organizationId=${orgId}`);
			if (!res.ok) throw new Error('Failed to fetch boards');
			return (await res.json()) as BoardType[];
		},
	});
}

export function useCreateBoard(orgId?: string | null) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: {
			title: string;
			description?: string;
			color?: string;
			createDefaultColumns?: boolean;
		}) => {
			const res = await fetch('/api/boards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...payload, organizationId: orgId }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create board');
			}
			return (await res.json()) as BoardType;
		},
		onSuccess: (board) => {
			queryClient.setQueryData<BoardType[] | undefined>(
				boardKeys.all(orgId ?? ''),
				(prev) => (prev ? [board, ...prev] : [board]),
			);
		},
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useUpdateBoard(orgId?: string | null) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			boardId,
			updates,
		}: {
			boardId: string;
			updates: Partial<Board>;
		}) => {
			const res = await fetch(`/api/boards/${boardId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});
			if (!res.ok) throw new Error('Failed to update board');
			return (await res.json()) as BoardType;
		},
		onMutate: async ({ boardId, updates }) => {
			await queryClient.cancelQueries({ queryKey: boardKeys.all(orgId ?? '') });
			const previous = queryClient.getQueryData<BoardType[]>(
				boardKeys.all(orgId ?? ''),
			);
			queryClient.setQueryData<BoardType[]>(
				boardKeys.all(orgId ?? ''),
				(old) =>
					(old ?? []).map((b) => (b.id === boardId ? { ...b, ...updates } : b)),
			);
			return { previous };
		},
		onError: (err, _vars, ctx) => {
			if (ctx?.previous) {
				queryClient.setQueryData(boardKeys.all(orgId ?? ''), ctx.previous);
			}
			toast.error((err as Error).message);
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: boardKeys.all(orgId ?? '') }),
	});
}

export function useDeleteBoard(orgId?: string | null) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (boardId: string) => {
			const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
			if (!res.ok) {
				throw new Error('Failed to delete board.\nYou are not authorized to delete this board.');
			}
			return boardId;
		},	
		onMutate: async (boardId) => {
			await queryClient.cancelQueries({ queryKey: boardKeys.all(orgId ?? '') });
			const previous = queryClient.getQueryData<BoardType[]>(
				boardKeys.all(orgId ?? ''),
			);
			queryClient.setQueryData<BoardType[]>(
				boardKeys.all(orgId ?? ''),
				(old) => (old ?? []).filter((b) => b.id !== boardId),
			);
			return { previous };
		},
		onError: (err, _vars, ctx) => {
			if (ctx?.previous) {
				queryClient.setQueryData(boardKeys.all(orgId ?? ''), ctx.previous);
			}
			toast.error((err as Error).message );
		},
		onSettled: () =>
			queryClient.invalidateQueries({ queryKey: boardKeys.all(orgId ?? '') }),
	});
}
