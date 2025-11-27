import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const taskCommentKey = (taskId: string) => ['task-comments', taskId] as const;

export function useTaskComments(taskId: string) {
	return useQuery({
		enabled: !!taskId,
		queryKey: taskCommentKey(taskId),
		queryFn: async () => {
			const res = await fetch(`/api/tasks/${taskId}/comments`);
			if (!res.ok) throw new Error('Failed to fetch comments');
			return res.json();
		},
	});
}

export function useCreateComment(taskId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (content: string) => {
			const res = await fetch(`/api/tasks/${taskId}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content }),
			});
			if (!res.ok) throw new Error('Failed to add comment');
			return res.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: taskCommentKey(taskId) }),
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useUpdateComment(taskId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			commentId,
			content,
		}: {
			commentId: string;
			content: string;
		}) => {
			const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content }),
			});
			if (!res.ok) throw new Error('Failed to update comment');
			return res.json();
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: taskCommentKey(taskId) }),
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useDeleteComment(taskId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (commentId: string) => {
			const res = await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
				method: 'DELETE',
			});
			if (!res.ok) throw new Error('Failed to delete comment');
			return commentId;
		},
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: taskCommentKey(taskId) }),
		onError: (err: Error) => toast.error(err.message),
	});
}
