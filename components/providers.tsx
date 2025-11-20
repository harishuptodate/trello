'use client';

import { SessionProvider } from 'next-auth/react';
import { OrganizationProvider } from '@/lib/organization-context';

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<OrganizationProvider>{children}</OrganizationProvider>
		</SessionProvider>
	);
}
