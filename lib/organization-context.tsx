'use client';

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';

type OrganizationContextType = {
	selectedOrgId: string | null;
	setSelectedOrgId: (orgId: string | null) => void;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
	undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

	useEffect(() => {
		const stored = localStorage.getItem('selectedOrgId');
		if (stored) {
			setSelectedOrgId(stored);
		}
	}, []);

	useEffect(() => {
		if (selectedOrgId) {
			localStorage.setItem('selectedOrgId', selectedOrgId);
		} else {
			localStorage.removeItem('selectedOrgId');
		}
	}, [selectedOrgId]);

	return (
		<OrganizationContext.Provider value={{ selectedOrgId, setSelectedOrgId }}>
			{children}
		</OrganizationContext.Provider>
	);
}

export function useOrganization() {
	const context = useContext(OrganizationContext);
	if (context === undefined) {
		throw new Error('useOrganization must be used within OrganizationProvider');
	}
	return context;
}
