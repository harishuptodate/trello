'use client';
import React from 'react';
import {
	ArrowLeft,
	ArrowRight,
	Filter,
	MoreHorizontal,
	Trello,
	Search,
	Plus,
} from 'lucide-react';
import {
	SignInButton,
	SignUpButton,
	SignOutButton,
	useUser,
	UserButton,
} from '@clerk/nextjs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavbarProps = {
	boardTitle?: string;
	onEditBoard?: () => void;
	onFilterClick?: () => void;
	filterCount?: number;
	// Dashboard props
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	onCreateBoardClick?: () => void;
};

export default function Navbar({
	boardTitle,
	onEditBoard,
	onFilterClick,
	filterCount = 0,
	searchValue = '',
	onSearchChange,
	onCreateBoardClick,
}: NavbarProps) {
	const { isSignedIn, user } = useUser();
	const pathname = usePathname();

	const isDashboardPage = pathname === '/dashboard';
	const isBoardPage = pathname.startsWith('/boards/');

	if (isDashboardPage) {
		return (
			<header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
				<div className="w-full px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
					<div className="flex items-center justify-between gap-2 sm:gap-3">
						{/* Logo */}
						<div className="flex items-center space-x-2 shrink-0">
							<Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
							<span className="text-lg sm:text-xl font-bold text-gray-900">
								Trello
							</span>
						</div>
						{/* Center: Search Bar + Create Button */}
						<div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center max-w-2xl">
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
								<Button onClick={onCreateBoardClick} className="shrink-0 h-8">
									<Plus className="h-4 w-4" />
									<span className="hidden sm:inline">Create</span>
								</Button>
							)}
						</div>
						{/* UserButton */}
						<div className="shrink-0">
							<UserButton />
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
							<div className="shrink-0">
								<UserButton />
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
				<div className="flex items-center space-x-2">
					<Trello className="h-6 w-6 sm:w-8 sm:h-8 text-blue-600" />
					<span className="text-xl sm:text-2xl font-bold text-gray-900">
						Trello
					</span>
				</div>
				<div className="flex items-center space-x-2 sm:space-x-4">
					{isSignedIn ? (
						<div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0">
							<span className="text-xs sm:text-sm text-shadow-gray-600 hidden sm:block mr-2 sm:mr-4">
								Welcome,{' '}
								{user.firstName ??
									user.emailAddresses[0].emailAddress
										.split('@')[0]
										.charAt(0)
										.toUpperCase() +
										user.emailAddresses[0].emailAddress.split('@')[0].slice(1)}
							</span>
							<Link href="/dashboard">
								<Button size="sm" className="text-xs sm:text-sm cursor-pointer">
									Go to Dashboard <ArrowRight />
								</Button>
							</Link>
						</div>
					) : (
						<div>
							<SignInButton>
								<Button
									variant="ghost"
									size="sm"
									className="text-sm sm:text-sm">
									Sign In
								</Button>
							</SignInButton>
							<SignUpButton>
								<Button size="sm" className="text-xs sm:text-sm">
									Sign Up
								</Button>
							</SignUpButton>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
