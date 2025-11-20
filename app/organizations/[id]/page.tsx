'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import { isOrgAdmin } from '@/lib/auth-rules';

export default function OrganizationPage() {
	const { data: session } = useSession();
	const params = useParams();
	const router = useRouter();
	const orgId = params.id as string;

	const [organization, setOrganization] = useState<any>(null);
	const [members, setMembers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
	const [memberEmail, setMemberEmail] = useState('');
	const [error, setError] = useState('');
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (session?.user && orgId) {
			loadOrganization();
			checkAdminStatus();
		}
	}, [session, orgId]);

	async function loadOrganization() {
		try {
			setLoading(true);
			const orgResponse = await fetch(`/api/organizations/${orgId}`);

			if (orgResponse.ok) {
				const org = await orgResponse.json();
				setOrganization(org);
				setMembers(org.members || []);
			}
		} catch (err) {
			console.error('Failed to load organization:', err);
		} finally {
			setLoading(false);
		}
	}

	async function checkAdminStatus() {
		if (!session?.user?.id) return;
		try {
			const response = await fetch(`/api/organizations/${orgId}`);
			if (response.ok) {
				const org = await response.json();
				const userMember = org.members.find(
					(m: any) => m.userId === session.user.id,
				);
				setIsAdmin(userMember?.role === 'ADMIN');
			}
		} catch (err) {
			console.error('Failed to check admin status:', err);
		}
	}

	useEffect(() => {
		if (organization && session?.user?.id) {
			const userMember = organization.members.find(
				(m: any) => m.userId === session.user.id,
			);
			setIsAdmin(userMember?.role === 'ADMIN');
		}
	}, [organization, session]);

	async function handleAddMember(e: React.FormEvent) {
		e.preventDefault();
		setError('');

		if (!memberEmail.trim()) {
			setError('Email is required');
			return;
		}

		try {
			const response = await fetch(`/api/organizations/${orgId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: memberEmail.trim() }),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Failed to add member');
				return;
			}

			await loadOrganization();
			setIsAddMemberDialogOpen(false);
			setMemberEmail('');
		} catch (err) {
			setError('An error occurred. Please try again.');
		}
	}

	async function handleRemoveMember(userId: string) {
		if (!confirm('Are you sure you want to remove this member?')) return;

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
		}
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<p className="text-lg font-medium text-gray-900">Loading...</p>
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
						<Button variant="ghost" className="mb-4">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Back to Organizations
						</Button>
					</Link>

					<Card className="mb-6">
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
									<span>{members.length} members</span>
								</div>
								<div className="flex items-center gap-2">
									<LayoutGrid className="h-4 w-4" />
									<span>{organization.boards?.length || 0} boards</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-bold text-gray-900">Members</h2>
						{isAdmin && (
							<Button onClick={() => setIsAddMemberDialogOpen(true)}>
								<UserPlus className="h-4 w-4 mr-2" />
								Add Member
							</Button>
						)}
					</div>

					<div className="space-y-2">
						{members.map((member) => (
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
													className="text-red-600 hover:text-red-700">
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</main>

			<Dialog
				open={isAddMemberDialogOpen}
				onOpenChange={setIsAddMemberDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Member</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleAddMember} className="space-y-4">
						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="memberEmail">Email Address</Label>
							<Input
								id="memberEmail"
								type="email"
								value={memberEmail}
								onChange={(e) => setMemberEmail(e.target.value)}
								placeholder="user@example.com"
								required
							/>
							<p className="text-xs text-gray-500">
								The user must already have an account
							</p>
						</div>
						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsAddMemberDialogOpen(false);
									setMemberEmail('');
									setError('');
								}}>
								Cancel
							</Button>
							<Button type="submit">Add Member</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
