'use client';

import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type OrganizationMemberWithOrg = {
	id: string;
	role: 'ADMIN' | 'MEMBER';
	organization: {
		id: string;
		name: string;
		slug: string;
		createdAt: Date;
		updatedAt: Date;
	};
};

type OrganizationContextType = {
	selectedOrgId: string | null;
	setSelectedOrgId: (id: string | null) => void;
	organizations: OrganizationMemberWithOrg[];
	loading: boolean;
	isAdmin: boolean;
	refetchOrganizations: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
	undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(null);
	const [organizations, setOrganizations] = useState<
		OrganizationMemberWithOrg[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);

	const fetchOrganizations = async () => {
		if (status !== 'authenticated' || !session?.user?.id) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const response = await fetch('/api/organizations');
			if (response.ok) {
				const orgs = await response.json();
				setOrganizations(orgs);

				if (orgs.length > 0) {
					const storedOrgId = localStorage.getItem('selectedOrgId');
					const defaultOrg = storedOrgId
						? orgs.find(
								(org: OrganizationMemberWithOrg) =>
									org.organization.id === storedOrgId,
						  )
						: orgs[0];

					if (defaultOrg) {
						setSelectedOrgIdState(defaultOrg.organization.id);
						setIsAdmin(defaultOrg.role === 'ADMIN');
					} else {
						setSelectedOrgIdState(orgs[0].organization.id);
						setIsAdmin(orgs[0].role === 'ADMIN');
					}
				} else {
					setSelectedOrgIdState(null);
					setIsAdmin(false);
				}
			} else {
				setOrganizations([]);
				setSelectedOrgIdState(null);
				setIsAdmin(false);
			}
		} catch (error) {
			console.error('Failed to fetch organizations:', error);
			setOrganizations([]);
			setSelectedOrgIdState(null);
			setIsAdmin(false);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrganizations();
	}, [session, status]);

	const setSelectedOrgId = (id: string | null) => {
		setSelectedOrgIdState(id);
		if (id) {
			localStorage.setItem('selectedOrgId', id);
			const selectedOrg = organizations.find(
				(org) => org.organization.id === id,
			);
			setIsAdmin(selectedOrg?.role === 'ADMIN' || false);
		} else {
			localStorage.removeItem('selectedOrgId');
			setIsAdmin(false);
		}
	};

	const value = {
		selectedOrgId,
		setSelectedOrgId,
		organizations,
		loading,
		isAdmin,
		refetchOrganizations: fetchOrganizations,
	};

	return (
		<OrganizationContext.Provider value={value}>
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
