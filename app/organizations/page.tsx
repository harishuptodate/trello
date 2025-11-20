'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/navbar';
import {
	Plus,
	Building2,
	Users,
	LayoutGrid,
	Crown,
	Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useOrganization } from '@/lib/organization-context';

export default function OrganizationsPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const { setSelectedOrgId } = useOrganization();
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [orgName, setOrgName] = useState('');
	const [orgSlug, setOrgSlug] = useState('');
	const [error, setError] = useState('');
	const [creatingOrg, setCreatingOrg] = useState(false);

	useEffect(() => {
		if (session?.user) {
			fetchOrganizations();
		}
	}, [session]);

	async function fetchOrganizations() {
		try {
			setLoading(true);
			const response = await fetch('/api/organizations');
			if (response.ok) {
				const orgs = await response.json();
				setOrganizations(orgs);
			}
		} catch (err) {
			console.error('Failed to load organizations:', err);
		} finally {
			setLoading(false);
		}
	}

	async function handleCreateOrganization(e: React.FormEvent) {
		e.preventDefault();
		setError('');

		if (!orgName.trim() || !orgSlug.trim() || creatingOrg) {
			if (!orgName.trim() || !orgSlug.trim()) {
				setError('Name and slug are required');
			}
			return;
		}

		// Validate slug format
		if (!/^[a-z0-9-]+$/.test(orgSlug)) {
			setError(
				'Slug must contain only lowercase letters, numbers, and hyphens',
			);
			return;
		}

		setCreatingOrg(true);
		try {
			const response = await fetch('/api/organizations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: orgName.trim(),
					slug: orgSlug.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Failed to create organization');
				return;
			}

			// Refresh organizations list
			await fetchOrganizations();
			setIsCreateDialogOpen(false);
			setOrgName('');
			setOrgSlug('');
		} catch (err) {
			setError('An error occurred. Please try again.');
		} finally {
			setCreatingOrg(false);
		}
	}

	function handleSelectOrganization(orgId: string) {
		setSelectedOrgId(orgId);
		router.push('/dashboard');
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
					<p className="text-lg font-medium text-gray-900">
						Loading organizations...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Navbar />
			<main className="w-full px-4 sm:px-6 lg:px-8 py-8">
				<div className="max-w-6xl mx-auto">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
								Organizations
							</h1>
							<p className="text-sm text-gray-600 mt-1">
								Manage your organizations and teams
							</p>
						</div>
						<Button onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Create Organization
						</Button>
					</div>

					{organizations.length === 0 ? (
						<Card>
							<CardContent className="p-12 text-center">
								<Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									No organizations yet
								</h3>
								<p className="text-sm text-gray-600 mb-4">
									Create your first organization to get started
								</p>
								<Button onClick={() => setIsCreateDialogOpen(true)}>
									<Plus className="h-4 w-4 mr-2" />
									Create Organization
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{organizations.map((orgMember) => (
								<Card
									key={orgMember.id}
									className="hover:shadow-lg transition-shadow">
									<Link href={`/organizations/${orgMember.organization.id}`}>
										<div className="cursor-pointer">
											<CardHeader>
												<div className="flex items-start justify-between">
													<div className="flex items-center space-x-2">
														<Building2 className="h-5 w-5 text-blue-600" />
														<CardTitle className="text-lg">
															{orgMember.organization.name}
														</CardTitle>
													</div>
													{orgMember.role === 'ADMIN' && (
														<Badge
															variant="secondary"
															className="flex items-center gap-1">
															<Crown className="h-3 w-3" />
															Admin
														</Badge>
													)}
												</div>
												<CardDescription>
													{orgMember.organization.slug}
												</CardDescription>
											</CardHeader>
											<CardContent>
												<div className="flex items-center justify-between text-sm text-gray-600">
													<div className="flex items-center gap-4">
														<div className="flex items-center gap-1">
															<Users className="h-4 w-4" />
															<span>
																{orgMember.organization._count?.members || 0}{' '}
																members
															</span>
														</div>
														<div className="flex items-center gap-1">
															<LayoutGrid className="h-4 w-4" />
															<span>
																{orgMember.organization._count?.boards || 0}{' '}
																boards
															</span>
														</div>
													</div>
												</div>
											</CardContent>
										</div>
									</Link>
								</Card>
							))}
						</div>
					)}
				</div>
			</main>

			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Organization</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreateOrganization} className="space-y-4">
						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="orgName">Organization Name</Label>
							<Input
								id="orgName"
								value={orgName}
								onChange={(e) => {
									setOrgName(e.target.value);
									// Auto-generate slug from name
									const slug = e.target.value
										.toLowerCase()
										.replace(/[^a-z0-9]+/g, '-')
										.replace(/^-+|-+$/g, '');
									setOrgSlug(slug);
								}}
								placeholder="My Organization"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="orgSlug">Slug</Label>
							<Input
								id="orgSlug"
								value={orgSlug}
								onChange={(e) => setOrgSlug(e.target.value)}
								placeholder="my-organization"
								required
								pattern="[a-z0-9-]+"
							/>
							<p className="text-xs text-gray-500">
								Lowercase letters, numbers, and hyphens only
							</p>
						</div>
						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsCreateDialogOpen(false);
									setOrgName('');
									setOrgSlug('');
									setError('');
								}}>
								Cancel
							</Button>
							<Button type="submit" disabled={creatingOrg}>
								{creatingOrg ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Creating...
									</>
								) : (
									'Create'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
