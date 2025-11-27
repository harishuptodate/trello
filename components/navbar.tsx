'use client';
import React, { useState, useEffect } from 'react';
import {
	ArrowLeft,
	ArrowRight,
	Filter,
	MoreHorizontal,
	Trello,
	Search,
	Plus,
	LogOut,
	User,
	ChevronDown,
	Building2,
	Pencil,
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/lib/organization-context';
import { useRef, useCallback } from 'react';

type NavbarProps = {
	boardTitle?: string;
	onEditBoard?: () => void;
	onFilterClick?: () => void;
	filterCount?: number;
	// Dashboard props
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	onCreateBoardClick?: () => void;
	organizations?: Array<{
		id: string;
		role: 'ADMIN' | 'MEMBER';
		organization: { id: string; name: string; slug: string };
	}>;
	selectedOrgId?: string | null;
	onOrgChange?: (orgId: string) => void;
};

export default function Navbar({
	boardTitle,
	onEditBoard,
	onFilterClick,
	filterCount = 0,
	searchValue = '',
	onSearchChange,
	onCreateBoardClick,
	organizations = [],
	selectedOrgId,
	onOrgChange,
}: NavbarProps) {
	const { data: session, update: updateSession } = useSession();
	const pathname = usePathname();
	const { selectedOrgId: contextOrgId, setSelectedOrgId } = useOrganization();
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [isEditingName, setIsEditingName] = useState(false);
	const [nameInput, setNameInput] = useState('');
	const [isSavingName, setIsSavingName] = useState(false);
	const [nameError, setNameError] = useState('');
	const [displayName, setDisplayName] = useState('User');
	const userMenuRef = useRef<HTMLDivElement | null>(null);

	const isDashboardPage = pathname === '/dashboard';
	const isBoardPage = pathname.startsWith('/boards/');
	const isSignedIn = !!session;

	const currentOrgId = selectedOrgId || contextOrgId;

	const computeDisplayName = () => {
		if (session?.user?.name) return session.user.name;
		if (session?.user?.email) {
			const [local] = session.user.email.split('@');
			return local.charAt(0).toUpperCase() + local.slice(1);
		}
		return 'User';
	};

	useEffect(() => {
		const currentDisplay = computeDisplayName();
		setDisplayName(currentDisplay);
		setNameInput(currentDisplay);
	}, [session?.user?.name, session?.user?.email]);

	const handleSignOut = async () => {
		await signOut({ callbackUrl: '/' });
	};

	const resetNameEditing = useCallback(() => {
		setIsEditingName(false);
		setNameInput(displayName || '');
		setNameError('');
	}, [displayName]);

	const handleNameSubmit = async (event?: React.FormEvent) => {
		event?.preventDefault();

		const trimmedName = nameInput.trim();
		if (!trimmedName) {
			setNameError('Please enter a name.');
			return;
		}

		setIsSavingName(true);
		setNameError('');

		try {
			const response = await fetch('/api/users', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: trimmedName }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.error || 'Failed to update name.');
			}

			await updateSession?.({
				// Trigger NextAuth session update; jwt callback syncs token fields
				user: {
					...session?.user,
					name: data.user?.name || trimmedName,
				},
			});
			setDisplayName(trimmedName);
			setNameInput(trimmedName);
			setIsEditingName(false);
		} catch (error) {
			setNameError(
				error instanceof Error ? error.message : 'Failed to update name.',
			);
		} finally {
			setIsSavingName(false);
		}
	};

	useEffect(() => {
		if (!isEditingName) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				userMenuRef.current &&
				!userMenuRef.current.contains(event.target as Node)
			) {
				resetNameEditing();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isEditingName, resetNameEditing]);

	useEffect(() => {
		if (!userMenuOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				userMenuRef.current &&
				!userMenuRef.current.contains(event.target as Node)
			) {
				setUserMenuOpen(false);
				resetNameEditing();
			}
		};
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setUserMenuOpen(false);
				resetNameEditing();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [userMenuOpen, resetNameEditing]);

	const renderUserMenu = () => (
		<div
			ref={userMenuRef}
			className="absolute right-0 mt-2 w-56 bg-white border rounded-md shadow-lg z-50">
			<div className="p-3 border-b">
				{!isEditingName ? (
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="text-sm font-medium truncate">
								{displayName || 'User'}
							</p>
							<p className="text-xs text-gray-500 truncate">
								{session?.user?.email}
							</p>
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 shrink-0"
							onClick={() => setIsEditingName(true)}>
							<Pencil className="h-4 w-4" />
						</Button>
					</div>
				) : (
					<form className="space-y-2" onSubmit={handleNameSubmit}>
						<Input
							value={nameInput}
							onChange={(event) => setNameInput(event.target.value)}
							autoFocus
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									handleNameSubmit(event);
								}
								if (event.key === 'Escape') {
									resetNameEditing();
								}
							}}
							className="h-9 bg-blue-50 ring-2 ring-blue-200 focus-visible:ring-blue-500 focus-visible:ring-1"
						/>
						{nameError && (
							<p className="text-xs text-red-500">{nameError}</p>
						)}
						<Button
							type="submit"
							size="sm"
							disabled={isSavingName}
							className="sm:hidden">
							{isSavingName ? 'Saving...' : 'Save'}
						</Button>
					</form>
				)}
			</div>
			<button
				onClick={handleSignOut}
				className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
				<LogOut className="h-4 w-4" />
				Sign Out
			</button>
		</div>
	);

	if (isDashboardPage) {
		return (
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
					<div className="flex items-center justify-between gap-2 sm:gap-3">
						<Link href="/">
							{/* Logo */}
							<div className="flex items-center space-x-2 shrink-0">
								<Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
								<span className="text-lg sm:text-xl font-bold text-gray-900">
									Trello
								</span>
							</div>
						</Link>
						{/* Center: Search Bar + Create Button */}
						<div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center max-w-2xl">
							<Link href="/organizations">
								<Button variant="ghost" size="sm" className="h-8 cursor-pointer border-gray-200 border rounded-md">
									<Building2 className="h-4 w-4 mr-2" />
									<span className="hidden cursor-pointer sm:inline">Organizations</span>
								</Button>
							</Link>
							{organizations.length > 0 && (
								<Select
									value={currentOrgId || undefined}
									onValueChange={(value) => {
										setSelectedOrgId(value);
										onOrgChange?.(value);
									}}>
									<SelectTrigger className="cursor-pointer w-[180px] h-8">
										<SelectValue placeholder="Select organization" />
									</SelectTrigger>
									<SelectContent>
										{organizations.map((org) => (
											<SelectItem key={org.id} value={org.organization.id} className="cursor-pointer">
												{org.organization.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
							<div className="relative flex-1 max-w-md">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
								<Input
									id="Search"
									placeholder="Search boards..."
									className="pl-10 h-8"
									value={searchValue}
									onChange={(e) =>
										onSearchChange && onSearchChange(e.target.value)
									}
								/>
							</div>
							{onCreateBoardClick && (
								<Button onClick={onCreateBoardClick} className="shrink-0 h-8 cursor-pointer">
									<Plus className="h-4 w-4" />
									<span className="hidden sm:inline">Create</span>
								</Button>
							)}
						</div>
						{/* User Menu */}
						<div className="shrink-0 relative">
							<Button
								variant="ghost"
								size="sm"
								className="h-8 gap-2 cursor-pointer"
								onClick={() => setUserMenuOpen(!userMenuOpen)}>
								<User className="h-4 w-4" />
								<span className="hidden sm:inline truncate max-w-[100px]">
									{displayName}
								</span>
								<ChevronDown className="h-4 w-4" />
							</Button>
							{userMenuOpen && renderUserMenu()}
						</div>
					</div>
				</div>
			</header>
		);
	}

	if (isBoardPage) {
		return (
			<header className="bg-white border-b sticky top-0 z-50">
				<div className="w-full px-4 sm:px-6 lg:px-12 py-3 sm:py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
							<Link
								href="/dashboard"
								className="flex items-center text-gray-600 hover:gray-900 shrink-0">
								<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
								<span className="hidden sm:inline ml-2">Back to Dashboard</span>
								<span className="sm:hidden">Back</span>
							</Link>
						</div>
						<div className="flex items-center space-x-1 sm:space-x-2 min-w-0 absolute left-1/2 transform -translate-x-1/2">
							<Trello className="text-blue-600 shrink-0" />
							<div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
								<span className="text-lg font-bold text-gray-900 truncate">
									{boardTitle}
								</span>
								{onEditBoard && (
									<Button
										variant="ghost"
										size="sm"
										className="h-7 w-7 shrink-0 p-0"
										onClick={onEditBoard}>
										<MoreHorizontal />
									</Button>
								)}
							</div>
						</div>
						<div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
							{onFilterClick && (
								<Button
									variant="outline"
									onClick={onFilterClick}
									size="sm"
									className={`text-xs sm:text-sm ${
										filterCount > 0 ? 'bg-blue-100 border-blue-200' : ''
									}`}>
									<Filter className="h-3 w-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
									<span className="hidden sm:inline">Filter</span>
									{filterCount > 0 && (
										<Badge
											variant="secondary"
											className="text-xs ml-1 sm:ml-2 bg-blue-100 border-blue-200">
											{filterCount}
										</Badge>
									)}
								</Button>
							)}
							<div className="shrink-0 relative">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 gap-2 cursor-pointer"
									onClick={() => setUserMenuOpen((prev) => !prev)}>
									<User className="h-4 w-4" />
									<ChevronDown className="h-4 w-4" />
								</Button>
								{userMenuOpen && renderUserMenu()}
							</div>
						</div>
					</div>
				</div>
			</header>
		);
	}

	return (
		<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
			<div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
				<Link href="/">
					<div className="flex items-center space-x-2">
						<Trello className="h-6 w-6 sm:w-8 sm:h-8 text-blue-600" />
						<span className="text-xl sm:text-2xl font-bold text-gray-900">
							Trello
						</span>
					</div>
				</Link>
				<div className="flex items-center space-x-2 justify-end sm:space-x-4">
					{isSignedIn ? (
						<div className="flex items-center space-x-2">
						<div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0">
							<span className="text-xs font-semibold sm:text-sm text-shadow-gray-600 hidden sm:block mr-2 sm:mr-4">
								Welcome,{' '}
								{displayName}
							</span>
						</div>

						<div className="shrink-0 relative">
								<Button
									variant="ghost"
									size="sm"
									className="h-8 gap-2 cursor-pointer"
									onClick={() => setUserMenuOpen(!userMenuOpen)}>
									<User className="h-4 w-4" />
									<ChevronDown className="h-4 w-4" />
								</Button>
								{userMenuOpen && renderUserMenu()}
							</div>
						</div>
				
				
				) : (
						<div>
							<Link href="/auth/signin">
								<Button
									variant="ghost"
									size="sm"
									className="text-sm sm:text-sm">
									Sign In
								</Button>
							</Link>
							<Link href="/auth/signup">
								<Button size="sm" className="text-xs sm:text-sm">
									Sign Up
								</Button>
							</Link>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
