'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
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
	Building2,
	Users,
	LayoutGrid,
	Crown,
	UserPlus,
	Trash2,
	ArrowLeft,
	Search,
	Loader2,
	Check,
} from 'lucide-react';
import Link from 'next/link';
import { isOrgAdmin } from '@/lib/auth-rules';
import { useOrganization } from '@/lib/organization-context';

export default function OrganizationPage() {
	const { data: session } = useSession();
	const params = useParams();
	const router = useRouter();
	const { setSelectedOrgId } = useOrganization();
	const orgId = params.id as string;

	const [organization, setOrganization] = useState<any>(null);
	const [members, setMembers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
	const [memberEmail, setMemberEmail] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState<any[]>([]);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState('');
	const [isAdmin, setIsAdmin] = useState(false);
	const [addingMember, setAddingMember] = useState(false);
	const [removingMember, setRemovingMember] = useState<string | null>(null);

	const loadOrganization = useCallback(async () => {
		try {
			setLoading(true);
			const [orgResponse, membersResponse] = await Promise.all([
				fetch(`/api/organizations/${orgId}`),
				fetch(`/api/organizations/${orgId}/members`),
			]);

			if (orgResponse.ok) {
				const org = await orgResponse.json();
				setOrganization(org);
			}

			if (membersResponse.ok) {
				const membersData = await membersResponse.json();
				setMembers(membersData);
				// Update admin status
				if (session?.user?.id) {
					const userMember = membersData.find(
						(m: any) => m.userId === session.user.id,
					);
					setIsAdmin(userMember?.role === 'ADMIN' || false);
				}
			}
		} catch (err) {
			console.error('Failed to load organization:', err);
		} finally {
			setLoading(false);
		}
	}, [orgId, session?.user?.id]);

	useEffect(() => {
		if (session?.user && orgId) {
			loadOrganization();
		}
	}, [session, orgId, loadOrganization]);

	useEffect(() => {
		if (organization && session?.user?.id) {
			const userMember = members.find((m: any) => m.userId === session.user.id);
			setIsAdmin(userMember?.role === 'ADMIN' || false);
		}
	}, [organization, members, session]);

	useEffect(() => {
		if (organization && session?.user?.id) {
			const userMember = organization.members.find(
				(m: any) => m.userId === session.user.id,
			);
			setIsAdmin(userMember?.role === 'ADMIN');
		}
	}, [organization, session]);

	const searchUsers = useCallback(
		async (query: string) => {
			if (query.length < 2) {
				setSearchResults([]);
				return;
			}

			setSearching(true);
			try {
				const response = await fetch(
					`/api/users/search?q=${encodeURIComponent(query)}`,
				);
				if (response.ok) {
					const data = await response.json();
					// Filter out users who are already members
					const memberUserIds = new Set(members.map((m: any) => m.userId));
					setSearchResults(
						data.users.filter((user: any) => !memberUserIds.has(user.id)),
					);
				}
			} catch (err) {
				console.error('Failed to search users:', err);
			} finally {
				setSearching(false);
			}
		},
		[members],
	);

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (searchQuery) {
				searchUsers(searchQuery);
			} else {
				setSearchResults([]);
			}
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [searchQuery, searchUsers]);

	const handleAddMember = useCallback(
		async (userId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') => {
			setError('');
			setAddingMember(true);

			try {
				const user = searchResults.find((u) => u.id === userId);
				if (!user) {
					setError('User not found');
					return;
				}

				const response = await fetch(`/api/organizations/${orgId}/members`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email: user.email, role }),
				});

				const data = await response.json();

				if (!response.ok) {
					setError(data.error || 'Failed to add member');
					return;
				}

				await loadOrganization();
				setSearchQuery('');
				setSearchResults([]);
			} catch (err) {
				setError('An error occurred. Please try again.');
			} finally {
				setAddingMember(false);
				setIsAddMemberDialogOpen(false);
			}
		},
		[orgId, searchResults, loadOrganization],
	);

	const handleRemoveMember = useCallback(
		async (userId: string) => {
			if (!confirm('Are you sure you want to remove this member?')) return;

			setRemovingMember(userId);
			try {
				const response = await fetch(
					`/api/organizations/${orgId}/members?userId=${userId}`,
					{
						method: 'DELETE',
					},
				);

				if (!response.ok) {
					const data = await response.json();
					alert(data.error || 'Failed to remove member');
					return;
				}

				await loadOrganization();
			} catch (err) {
				alert('An error occurred. Please try again.');
			} finally {
				setRemovingMember(null);
			}
		},
		[orgId, loadOrganization],
	);

	const handleCardClick = useCallback(() => {
		setSelectedOrgId(orgId);
		router.push('/dashboard');
	}, [orgId, setSelectedOrgId, router]);

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
					<p className="text-lg font-medium text-gray-900">
						Loading Organization...
					</p>
				</div>
			</div>
		);
	}

	if (!organization) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-lg font-medium text-gray-900">
						Organization not found
					</p>
					<Link href="/organizations">
						<Button className="mt-4">Back to Organizations</Button>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Navbar />
			<main className="w-full px-4 sm:px-6 lg:px-8 py-8">
				<div className="max-w-4xl mx-auto">
					<Link href="/organizations">
						<Button variant="ghost" className="mb-4 cursor-pointer">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Organizations
						</Button>
					</Link>

					<Card 
						className="mb-6 cursor-pointer hover:shadow-md transition-shadow"
						onClick={handleCardClick}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-2">
									<Building2 className="h-6 w-6 text-blue-600" />
									<div>
										<CardTitle className="text-2xl">
											{organization.name}
										</CardTitle>
										<CardDescription>{organization.slug}</CardDescription>
									</div>
								</div>
								{isAdmin && (
									<Badge
										variant="secondary"
										className="flex items-center gap-1">
										<Crown className="h-3 w-3" />
										Admin
									</Badge>
								)}
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-6 text-sm text-gray-600">
								<div className="flex items-center gap-2">
									<Users className="h-4 w-4" />
									<span>
										{members.length === 1
											? '1 member'
											: `${members.length || 0} members`}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<LayoutGrid className="h-4 w-4" />
									<span>
										{organization._count?.boards === 1
											? '1 board'
											: `${organization._count?.boards || 0} boards`}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-bold text-gray-900">Members</h2>
						{isAdmin && (
							<Button
								className="cursor-pointer"
								onClick={() => setIsAddMemberDialogOpen(true)}>
								<UserPlus className="h-4 w-4 mr-2" />
								Add Member
							</Button>
						)}
					</div>

					<div className="space-y-2">
						{members.length === 0 ? (
							<Card>
								<CardContent className="p-8 text-center">
									<Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
									<p className="text-sm text-gray-600">No members yet</p>
								</CardContent>
							</Card>
						) : (
							members.map((member) => (
								<Card key={member.id}>
									<CardContent className="p-4">
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
													<span className="text-blue-600 font-medium">
														{member.user.name?.[0] ||
															member.user.email[0].toUpperCase()}
													</span>
												</div>
												<div>
													<p className="font-medium text-gray-900">
														{member.user.name || 'No name'}
													</p>
													<p className="text-sm text-gray-600">
														{member.user.email}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-3">
												{member.role === 'ADMIN' && (
													<Badge
														variant="secondary"
														className="flex items-center gap-1">
														<Crown className="h-3 w-3" />
														Admin
													</Badge>
												)}
												{isAdmin && member.userId !== session?.user?.id && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleRemoveMember(member.userId)}
														disabled={removingMember === member.userId}
														className="text-red-600 hover:text-red-700 cursor-pointer">
														{removingMember === member.userId ? (
															<Loader2 className="h-4 w-4 animate-spin" />
														) : (
															<Trash2 className="h-4 w-4" />
														)}
													</Button>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							))
						)}
					</div>
				</div>
			</main>

			<Dialog
				open={isAddMemberDialogOpen}
				onOpenChange={(open) => {
					setIsAddMemberDialogOpen(open);
					if (!open) {
						setSearchQuery('');
						setSearchResults([]);
						setError('');
					}
				}}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Add Member</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="searchUsers">Search Users</Label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									id="searchUsers"
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search by name or email..."
									className="pl-10"
								/>
								{searching && (
									<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
										<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
									</div>
								)}
							</div>
							<p className="text-xs text-gray-500">
								Search for users by name or email to add them to the
								organization
							</p>
						</div>

						{searchResults.length > 0 && (
							<div className="space-y-2 max-h-60 overflow-y-auto">
								<Label>Search Results</Label>
								{searchResults.map((user) => (
									<div
										key={user.id}
										className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
										<div className="flex items-center space-x-3">
											<div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
												<span className="text-blue-600 font-medium text-sm">
													{user.name?.[0] || user.email[0].toUpperCase()}
												</span>
											</div>
											<div>
												<p className="text-sm font-medium text-gray-900">
													{user.name || 'No name'}
												</p>
												<p className="text-xs text-gray-600">{user.email}</p>
											</div>
										</div>
										<div className="flex gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleAddMember(user.id, 'MEMBER')}
												disabled={addingMember}>
												{addingMember ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													'Add'
												)}
											</Button>
											<Button
												size="sm"
												onClick={() => handleAddMember(user.id, 'ADMIN')}
												disabled={addingMember}>
												{addingMember ? (
													<Loader2 className="h-3 w-3 animate-spin" />
												) : (
													'Add Admin'
												)}
											</Button>
										</div>
									</div>
								))}
							</div>
						)}

						{searchQuery.length >= 2 &&
							!searching &&
							searchResults.length === 0 && (
								<div className="text-center py-4 text-sm text-gray-500">
									No users found matching "{searchQuery}"
								</div>
							)}

						<div className="flex justify-end space-x-2 pt-4 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsAddMemberDialogOpen(false);
									setSearchQuery('');
									setSearchResults([]);
									setError('');
								}}>
								Close
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
