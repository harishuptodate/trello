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
	ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useOrganization } from '@/lib/organization-context';
import {
	useOrganizations,
	useCreateOrganization,
} from '@/lib/hooks/queries/useOrganizations';

export default function OrganizationsPage() {
	const { data: session } = useSession();
	const router = useRouter();
	const { setSelectedOrgId } = useOrganization();
	const { data: organizations = [], isLoading: loading, refetch } =
		useOrganizations();
	const createOrganizationMutation = useCreateOrganization();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [orgName, setOrgName] = useState('');
	const [orgSlug, setOrgSlug] = useState('');
	const [error, setError] = useState('');
	const [creatingOrg, setCreatingOrg] = useState(false);

	useEffect(() => {
		if (session?.user) {
			refetch();
		}
	}, [session, refetch]);

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
			await createOrganizationMutation.mutateAsync({
				name: orgName.trim(),
				slug: orgSlug.trim(),
			});
			await refetch();
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
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 w-10 h-10 text-blue-600 animate-spin" />
					<p className="text-lg font-medium text-gray-900">
						Loading Organizations...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Navbar />
			<main className="px-4 py-8 w-full sm:px-6 lg:px-8">
				<div className="mx-auto max-w-6xl">
					<div className="flex justify-between items-center mb-8">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
								Organizations
							</h1>
							<p className="mt-1 text-sm text-gray-600">
								Manage your organizations and teams
							</p>
						</div>
						<Button className="cursor-pointer" onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className="mr-2 w-4 h-4" />
							Create Organization
						</Button>
					</div>

					{organizations.length === 0 ? (
						<Card>
							<CardContent className="p-12 text-center">
								<Building2 className="mx-auto mb-4 w-12 h-12 text-gray-400" />
								<h3 className="mb-2 text-lg font-medium text-gray-900">
									No organizations yet
								</h3>
								<p className="mb-4 text-sm text-gray-600">
									Create your first organization to get started
								</p>
								<Button onClick={() => setIsCreateDialogOpen(true)}>
									<Plus className="mr-2 w-4 h-4" />
									Create Organization
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{organizations.map((orgMember: any) => (
								<Card
									key={orgMember.id}
									className="transition-shadow hover:shadow-lg">
									<Link href={`/organizations/${orgMember.organization.id}`}>
										<div className="cursor-pointer">
											<CardHeader>
												<div className="flex justify-between items-start">
													<div className="flex items-center space-x-2">
														<Building2 className="w-5 h-5 text-blue-600" />
														<CardTitle className="text-lg">
															{orgMember.organization.name}
														</CardTitle>
													</div>
													{orgMember.role === 'ADMIN' && (
														<Badge
															variant="secondary"
															className="flex gap-1 items-center">
															<Crown className="w-3 h-3" />
															Admin
														</Badge>
													)}
												</div>
											</CardHeader>
											<CardContent>
												<div className="flex justify-between items-center text-sm text-gray-600">
													<div className="flex gap-4 items-center">
														<div className="flex gap-1 items-center">
															<Users className="w-4 h-4" />
															<span>
																{orgMember.organization._count?.members === 1 ? '1 member' : `${orgMember.organization._count?.members} members`}
															</span>
														</div>
														<div className="flex gap-1 items-center">
															<LayoutGrid className="w-4 h-4" />
															<span>
																{orgMember.organization._count?.boards === 1 ? '1 board' : `${orgMember.organization._count?.boards} boards`}
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
			<div className="fixed bottom-8 left-1/2 z-50 transform -translate-x-1/2">
				<Link href="/dashboard">
					<Button className="shadow-lg cursor-pointer">
						<ArrowLeft className="mr-2 w-4 h-4" />
						Back to Dashboard
					</Button>
				</Link>
			</div>

			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Organization</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreateOrganization} className="space-y-4">
						{error && (
							<div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
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
										<Loader2 className="mr-2 w-4 h-4 animate-spin" />
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
