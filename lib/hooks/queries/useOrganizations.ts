import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const orgKeys = {
	all: ['organizations'] as const,
};

export function useOrganizations() {
	return useQuery({
		queryKey: orgKeys.all,
		queryFn: async () => {
			const res = await fetch('/api/organizations');
			if (!res.ok) throw new Error('Failed to fetch organizations');
			return res.json();
		},
	});
}

export function useCreateOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: { name: string; slug: string }) => {
			const res = await fetch('/api/organizations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || 'Failed to create organization');
			}
			return res.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
		onError: (err: Error) => toast.error(err.message),
	});
}

export function useUpdateOrganization() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			orgId,
			updates,
		}: {
			orgId: string;
			updates: { name?: string; slug?: string };
		}) => {
			const res = await fetch(`/api/organizations/${orgId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates),
			});
			if (!res.ok) throw new Error('Failed to update organization');
			return res.json();
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all }),
		onError: (err: Error) => toast.error(err.message),
	});
}
