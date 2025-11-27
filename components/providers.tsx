'use client';

import { SessionProvider } from 'next-auth/react';
import { OrganizationProvider } from '@/lib/organization-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => getQueryClient());

	return (
		<SessionProvider>
			<QueryClientProvider client={queryClient}>
				<OrganizationProvider>
					{children}
					<Toaster richColors />
				</OrganizationProvider>
			</QueryClientProvider>
		</SessionProvider>
	);
}
