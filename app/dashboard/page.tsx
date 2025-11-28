'use client';
import Navbar from '@/components/navbar';
import { Badge } from '@/components/ui/badge';
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
import {
	useBoards,
	useCreateBoard,
	useUpdateBoard,
	useDeleteBoard,
	BoardType,
} from '@/lib/hooks/queries/useBoards';
import { useSession } from 'next-auth/react';
import {
	Filter,
	Grid3X3,
	List,
	Loader2,
	MoreHorizontal,
	Plus,
	Rocket,
	Search,
	Trello,
	Edit,
	Trash2,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useOrganization } from '@/lib/organization-context';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
	const { data: session } = useSession();
	const {
		selectedOrgId,
		setSelectedOrgId,
		organizations,
		loading: orgLoading,
		isAdmin,
		refetchOrganizations,
	} = useOrganization();

	const {
		data: boards = [],
		isLoading: boardsLoading,
		refetch,
	} = useBoards(selectedOrgId);
	const createBoardMutation = useCreateBoard(selectedOrgId);
	const updateBoardMutation = useUpdateBoard(selectedOrgId);
	const deleteBoardMutation = useDeleteBoard(selectedOrgId);
	const router = useRouter();
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingBoard, setEditingBoard] = useState<BoardType | null>(null);
	const [deletingBoard, setDeletingBoard] = useState<BoardType | null>(null);
	const [editTitle, setEditTitle] = useState('');
	const [editColor, setEditColor] = useState('');
	const [boardTitle, setBoardTitle] = useState('');
	const [createDefaultColumns, setCreateDefaultColumns] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [creatingBoard, setCreatingBoard] = useState(false);
	const [updatingBoard, setUpdatingBoard] = useState(false);
	const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
	const [filters, setFilters] = useState({
		search: '',
		dataRange: {
			start: null as string | null,
			end: null as string | null,
		},
		taskCount: {
			min: null as number | null,
			max: null as number | null,
		},
	});

	useEffect(() => {
		if (selectedOrgId) {
			refetch();
		}
	}, [selectedOrgId, refetch]);

	const filteredBoards = useMemo(
		() =>
			boards.filter((board: BoardType) => {
				if (!board || !board.title) return false;

				const matchesSearch = board.title
					.toLowerCase()
					.includes(filters.search.toLowerCase());
				const matchesDateRange =
					!filters.dataRange.start ||
					(new Date(board.createdAt) >= new Date(filters.dataRange.start) &&
						(!filters.dataRange.end ||
							new Date(board.createdAt) <= new Date(filters.dataRange.end)));
				return matchesSearch && matchesDateRange;
			}),
		[boards, filters.search, filters.dataRange.start, filters.dataRange.end],
	);

	const handleCreateBoard = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (creatingBoard) return;
			setCreatingBoard(true);
			try {
				await createBoardMutation.mutateAsync({
					title: boardTitle,
					createDefaultColumns,
				});
				setBoardTitle('');
				setCreateDefaultColumns(true);
				setIsCreateDialogOpen(false);
			} catch (error) {
				console.error('Error creating board:', error);
			} finally {
				setCreatingBoard(false);
			}
		},
		[
			boardTitle,
			createDefaultColumns,
			creatingBoard,
			createBoardMutation,
		],
	);

	const handleEditBoard = useCallback(
		(board: BoardType, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setEditingBoard(board);
			setEditTitle(board.title);
			setEditColor(board.color);
			setIsEditDialogOpen(true);
			setOpenDropdownId(null);
		},
		[],
	);

	const handleDeleteBoard = useCallback(
		(board: BoardType, e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setDeletingBoard(board);
			setIsDeleteDialogOpen(true);
			setOpenDropdownId(null);
		},
		[],
	);

	const handleUpdateBoard = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			if (!editingBoard || !editTitle.trim() || updatingBoard) return;
			setUpdatingBoard(true);
			try {
				await updateBoardMutation.mutateAsync({
					boardId: editingBoard.id,
					updates: {
						title: editTitle.trim(),
						color: editColor || editingBoard.color,
					},
					// color: editColor || editingBoard.color,
				});
				setIsEditDialogOpen(false);
				setEditingBoard(null);
				setEditTitle('');
				setEditColor('');
			} catch (error) {
				console.error('Error updating board:', error);
			} finally {
				setUpdatingBoard(false);
			}
		},
		[editingBoard, editTitle, editColor, updatingBoard, updateBoardMutation],
	);

	const handleConfirmDelete = useCallback(async () => {
		if (!deletingBoard || deletingBoardId) return;
		setDeletingBoardId(deletingBoard.id);
		try {
			await deleteBoardMutation.mutateAsync(deletingBoard.id);
			setIsDeleteDialogOpen(false);
			setDeletingBoard(null);
		} catch (error) {
			console.error('Error deleting board:', error);
		} finally {
			setDeletingBoardId(null);
			setIsDeleteDialogOpen(false);
		}
	}, [deletingBoard, deletingBoardId, deleteBoardMutation]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (openDropdownId) {
				setOpenDropdownId(null);
			}
		};
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	}, [openDropdownId]);

	const clearFilters = useCallback(() => {
		setFilters({
			search: '',
			dataRange: {
				start: null,
				end: null,
			},
			taskCount: {
				min: null,
				max: null,
			},
		});
	}, []);

	if (orgLoading || (boardsLoading && selectedOrgId)) {
		return (
			<div className="flex gap-2 justify-center items-center h-screen">
				<Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
				<span className="text-lg font-medium text-gray-900">
					Loading your boards...
				</span>
			</div>
		);
	}

	if (!selectedOrgId && organizations.length === 0 && !orgLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="text-center">
					<p className="mb-4 text-lg font-medium text-gray-900">
						No organizations found
					</p>
					<p className="mb-4 text-sm text-gray-600">
						Please create an organization to get started
					</p>
					<Button onClick={() => (window.location.href = '/organizations')}>
						Go to Organizations
					</Button>
				</div>
			</div>
		);
	}

	if (!selectedOrgId && !orgLoading) {
		return (
			<div className="flex justify-center items-center min-h-screen bg-gray-50">
				<div className="text-center">
					<p className="mb-4 text-lg font-medium text-gray-900">
						Please select an organization
					</p>
					<Button onClick={() => (window.location.href = '/organizations')}>
						Go to Organizations
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<Navbar
				searchValue={filters.search}
				onSearchChange={(value) =>
					setFilters((prev) => ({ ...prev, search: value }))
				}
				onCreateBoardClick={() => {
					if (isAdmin && selectedOrgId) { // what if selectedOrgId is null? meaning 
						setIsCreateDialogOpen(true);
					}else{
						alert('You are not authorized to create a board');
					}
				}}
				organizations={organizations}
				selectedOrgId={selectedOrgId}
				onOrgChange={(orgId) => {
					setSelectedOrgId(orgId);
				}}
			/>
			<main className="px-4 py-4 w-full sm:px-6 lg:px-8 sm:py-6">
				<div className="mb-4 sm:mb-6">
					<h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
						Welcome back,{' '}
						{session?.user?.name ||
							session?.user?.email?.split('@')[0] ||
							'User'}
						! 👋
					</h1>
					<p className="text-sm text-gray-600">
						Here's whats's hapening with your boards today.
					</p>
				</div>

				{/* Stats*/}
				{/* <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4 sm:gap-6 sm:mb-8">
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex justify-between items-center">
								<div>
									<p className="text-xs font-medium text-gray-600 sm:text-sm">
										Total Boards
									</p>
									<p className="text-xl font-bold text-gray-900 sm:text-2xl">
										{boards.length}
									</p>
								</div>
								<div className="flex justify-center items-center w-10 h-10 bg-blue-100 rounded-lg sm:w-12">
									<Trello className="w-5 h-5 text-blue-600 sm:h-6 sm:w-6" />
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex justify-between items-center">
								<div>
									<p className="text-xs font-medium text-gray-600 sm:text-sm">
										Active Projects
									</p>
									<p className="text-xl font-bold text-gray-900 sm:text-2xl">
										{boards.length}
									</p>
								</div>
								<div className="flex justify-center items-center w-10 h-10 bg-green-100 rounded-lg sm:w-12">
									<Rocket />
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex justify-between items-center">
								<div>
									<p className="text-xs font-medium text-gray-600 sm:text-sm">
										Recent Activity
									</p>
									<p className="text-xl font-bold text-gray-900 sm:text-2xl">
										{
											boards.filter((board) => {
												if (!board || !board.updatedAt) return false;
												const updatedAt = new Date(board.updatedAt);
												const oneWeekAgo = new Date();
												oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
												return updatedAt > oneWeekAgo;
											}).length
										}
									</p>
								</div>
								<div className="flex justify-center items-center w-10 h-10 bg-purple-200 rounded-lg sm:w-12">
									<div className="text-xl sm:text-2xl">📊</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex justify-between items-center">
								<div>
									<p className="text-xs font-medium text-gray-600 sm:text-sm">
										Total Boards
									</p>
									<p className="text-xl font-bold text-gray-900 sm:text-2xl">
										{boards.length}
									</p>
								</div>
								<div className="flex justify-center items-center w-10 h-10 bg-blue-100 rounded-lg sm:w-12">
									<Trello className="w-5 h-5 text-blue-600 sm:h-6 sm:w-6" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div> */}
				{/* Boards */}
				<div className="mb-4 sm:mb-6">
					<div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between sm:mb-6">
						<div>
							<h2 className="text-lg font-bold text-gray-900 sm:text-xl">
								Your Boards
							</h2>
							<p className="text-sm text-gray-600">
								Manage your projects and tasks
							</p>
						</div>
						<div className="flex flex-col gap-2 items-stretch sm:flex-row sm:items-center sm:gap-4">
							{/* View Toggle */}
							<div className="flex items-center p-1 space-x-2 bg-white rounded border">
								<Button
									variant={viewMode === 'grid' ? 'default' : 'ghost'}
									size={'sm'}
									onClick={() => setViewMode('grid')}>
									<Grid3X3 />
								</Button>
								<Button
									variant={viewMode === 'list' ? 'default' : 'ghost'}
									size={'sm'}
									onClick={() => setViewMode('list')}>
									<List />
								</Button>
							</div>
							{/* Filter Button */}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsFilterOpen(true)}>
								<Filter />
								Filter
							</Button>
						</div>
					</div>

					{/* Boards Grid/List */}

					{boards.length === 0 ? (
						<div className="text-sm text-gray-500">No boards yet</div>
					) : viewMode === 'grid' ? (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 sm:gap-4">
							{filteredBoards.map((board: BoardType, key: number) => (
								<div key={key} className="relative">
									<Link href={`/boards/${board.id}`}>
										<Card className="transition-shadow cursor-pointer hover:shadow-lg group">
											<CardHeader className="pb-3">
												<div className="flex justify-between items-center">
													<div className={`w-4 h-4 ${board.color} rounded`} />
													<div className="flex gap-2 items-center">
														{new Date(board.createdAt) >
														new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) ? (
															<Badge className="text-xs" variant="secondary">
																New
															</Badge>
														) : null}
														<div className="relative">
															<Button
																variant="ghost"
																size="sm"
																className="p-0 w-7 h-7 shrink-0"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	setOpenDropdownId(
																		openDropdownId === board.id
																			? null
																			: board.id,
																	);
																}}>
																<MoreHorizontal />
															</Button>
															{openDropdownId === board.id && (
																<div className="absolute right-0 top-8 z-50 w-40 bg-white rounded-md border shadow-lg">
																	<button
																		className="flex gap-2 items-center px-4 py-2 w-full text-sm text-left hover:bg-gray-100"
																		onClick={(e) => handleEditBoard(board, e)}>
																		<Edit className="w-4 h-4" />
																		Edit
																	</button>
																	<button
																		className="flex gap-2 items-center px-4 py-2 w-full text-sm text-left text-red-600 hover:bg-gray-100"
																		onClick={(e) =>
																			handleDeleteBoard(board, e)
																		}>
																		<Trash2 className="w-4 h-4" />
																		Delete
																	</button>
																</div>
															)}
														</div>
													</div>
												</div>
											</CardHeader>
											<CardContent className="p-4 sm:p-6">
												<CardTitle className="mb-2 text-base transition-colors sm:text-lg group-hover:text-blue-600">
													{board.title}
												</CardTitle>
												<CardDescription className="mb-4 text-sm">
													{board.description}
												</CardDescription>
												<div className="flex flex-col space-y-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
													<span>
														Created{' '}
														{new Date(board.createdAt).toLocaleDateString()}
													</span>
													<span>
														Updated{' '}
														{new Date(board.updatedAt).toLocaleDateString()}
													</span>
												</div>
											</CardContent>
										</Card>
									</Link>
								</div>
							))}
							{isAdmin && (
								<Card
									onClick={() => {
										setIsCreateDialogOpen(true);
									}}
									className="border-2 border-gray-300 border-dashed transition-colors cursor-pointer hover:border-blue-400 group">
									<CardContent className="flex flex-col justify-center items-center p-3 h-full sm:p-6">
										<Plus className="mb-2 w-6 h-6 text-gray-400 sm:h-8 sm:w-8 group-hover:text-blue-600" />
										<p className="text-sm font-medium text-gray-600 sm:text-base group-hover:text-blue-600">
											Create new board
										</p>
									</CardContent>
								</Card>
							)}
						</div>
					) : (
						<div>
							{filteredBoards.map((board: BoardType, key: number) => (
								<div key={key} className={key > 0 ? 'mt-4' : ''}>
									<div className="relative">
										<Link href={`/boards/${board.id}`}>
											<Card className="transition-shadow cursor-pointer hover:shadow-lg group">
												<CardHeader className="pb-3">
													<div className="flex justify-between items-center">
														<div className={`w-4 h-4 ${board.color} rounded`} />
														<div className="flex gap-2 items-center">
															{new Date(board.createdAt) >
															new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) ? (
																<Badge className="text-xs" variant="secondary">
																	New
																</Badge>
															) : null}
															<div className="relative">
																<Button
																	variant="ghost"
																	size="sm"
																	className="p-0 w-7 h-7 shrink-0"
																	onClick={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																		setOpenDropdownId(
																			openDropdownId === board.id
																				? null
																				: board.id,
																		);
																	}}>
																	<MoreHorizontal />
																</Button>
																{openDropdownId === board.id && (
																	<div className="absolute right-0 top-8 z-50 w-40 bg-white rounded-md border shadow-lg">
																		<button
																			className="flex gap-2 items-center px-4 py-2 w-full text-sm text-left hover:bg-gray-100"
																			onClick={(e) =>
																				handleEditBoard(board, e)
																			}>
																			<Edit className="w-4 h-4" />
																			Edit
																		</button>
																		<button
																			className="flex gap-2 items-center px-4 py-2 w-full text-sm text-left text-red-600 hover:bg-gray-100"
																			onClick={(e) =>
																				handleDeleteBoard(board, e)
																			}>
																			<Trash2 className="w-4 h-4" />
																			Delete
																		</button>
																	</div>
																)}
															</div>
														</div>
													</div>
												</CardHeader>
												<CardContent className="p-4 sm:p-6">
													<CardTitle className="mb-2 text-base transition-colors sm:text-lg group-hover:text-blue-600">
														{board.title}
													</CardTitle>
													<CardDescription className="mb-4 text-sm">
														{board.description}
													</CardDescription>
													<div className="flex flex-col space-y-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
														<span>
															Created{' '}
															{new Date(board.createdAt).toLocaleDateString()}
														</span>
														<span>
															Updated{' '}
															{new Date(board.updatedAt).toLocaleDateString()}
														</span>
													</div>
												</CardContent>
											</Card>
										</Link>
									</div>
								</div>
							))}
							{isAdmin && (
								<Card
									onClick={() => {
										setIsCreateDialogOpen(true);
									}}
									className="mt-4 border-2 border-gray-300 border-dashed transition-colors cursor-pointer hover:border-blue-400 group">
									<CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
										<Plus className="mb-2 w-6 h-6 text-gray-400 sm:h-8 sm:w-8 group-hover:text-blue-600" />
										<p className="text-sm font-medium text-gray-600 sm:text-base group-hover:text-blue-600">
											Create new board
										</p>
									</CardContent>
								</Card>
							)}
						</div>
					)}
				</div>
			</main>
			<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Filter Boards</DialogTitle>
						<p>Filter boards by title, date, or task count</p>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-x-2 space-y-2">
							<Label className="text-sm">Search</Label>
							<Input
								placeholder="Search boards..."
								value={filters.search}
								onChange={(e) =>
									setFilters((prev) => ({ ...prev, search: e.target.value }))
								}
							/>
						</div>
						<div className="space-y-2">
							<div className="grid grid-cols-1 justify-between items-center space-x-2 sm:grid-cols-2">
								<div className="space-y-1">
									<Label className="text-xs">Start Date</Label>
									<Input
										type="date"
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												dueDate: {
													...prev.dataRange,
													start: e.target.value ?? null,
												},
											}))
										}
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">End Date</Label>
									<Input
										type="date"
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												dueDate: {
													...prev.dataRange,
													end: e.target.value ?? null,
												},
											}))
										}
									/>
								</div>
							</div>
						</div>
						<div className="space-y-2">
							<Label className="text-sm">Task Count</Label>
							<div className="grid grid-cols-1 justify-between items-center space-x-2 sm:grid-cols-2">
								<div className="space-y-1">
									<Label className="text-xs">Minimum</Label>
									<Input
										type="number"
										min={0}
										placeholder="Min tasks"
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												taskCount: {
													...prev.taskCount,
													min: e.target.value ? Number(e.target.value) : null,
												},
											}))
										}
									/>
								</div>
								<div className="space-y-1">
									<Label className="text-xs">Maximum</Label>
									<Input
										type="number"
										min={0}
										placeholder="Max tasks"
										onChange={(e) =>
											setFilters((prev) => ({
												...prev,
												taskCount: {
													...prev.taskCount,
													max: e.target.value ? Number(e.target.value) : null,
												},
											}))
										}
									/>
								</div>
							</div>
						</div>
						<div className="flex flex-col justify-between pt-4 space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
							<Button variant="outline" onClick={clearFilters}>
								Clear Filters
							</Button>
							<Button variant="default" onClick={() => setIsFilterOpen(false)}>
								Apply Filters
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
			{/* Edit Board Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Board</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={handleUpdateBoard}>
						<div className="space-y-2">
							<Label htmlFor="boardTitle">Board Title</Label>
							<Input
								id="boardTitle"
								autoFocus={true}
								className="selection:bg-gray-500 selection:text-white"
								value={editTitle}
								onChange={(e) => setEditTitle(e.target.value)}
								placeholder="Enter board title..."
								required
							/>
						</div>

						<div className="space-y-2">
							<Label>Board Color</Label>
							<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
								{[
									'bg-blue-500',
									'bg-green-500',
									'bg-red-500',
									'bg-yellow-500',
									'bg-purple-500',
									'bg-orange-500',
									'bg-pink-500',
									'bg-teal-500',
									'bg-indigo-500',
									'bg-violet-500',
									'bg-cyan-500',
									'bg-emerald-500',
								].map((color, key) => (
									<button
										type="button"
										key={key}
										className={`w-8 h-8 rounded-full ${color} ${
											color === editColor
												? 'ring-2 ring-offset-2 ring-gray-600'
												: ''
										}`}
										onClick={() => setEditColor(color)}></button>
								))}
							</div>
						</div>
						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsEditDialogOpen(false);
									setEditingBoard(null);
									setEditTitle('');
									setEditColor('');
								}}>
								Cancel
							</Button>
							<Button
								className="focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary"
								type="submit"
								disabled={updatingBoard}>
								{updatingBoard ? (
									<>
										<Loader2 className="mr-2 w-4 h-4 animate-spin" />
										Updating...
									</>
								) : (
									'Save Changes'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			{/* Delete Confirmation Dialog */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Delete Board</DialogTitle>
						<p className="text-sm text-gray-600">
							Are you sure you want to delete "{deletingBoard?.title}"? This
							action cannot be undone.
						</p>
					</DialogHeader>
					<div className="flex justify-end pt-4 space-x-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setIsDeleteDialogOpen(false);
								setDeletingBoard(null);
							}}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleConfirmDelete}
							disabled={!!deletingBoardId}>
							{deletingBoardId ? (
								<>
									<Loader2 className="mr-2 w-4 h-4 animate-spin" />
									Deleting...
								</>
							) : (
								'Delete'
							)}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
			{/* create Board */}

			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Enter Board Title</DialogTitle>
					</DialogHeader>
					<form className="space-y-4" onSubmit={handleCreateBoard}>
						<div className="space-y-2">
							{/* <Label htmlFor="boardTitle">Board Title</Label> */}
							<Input
								id="boardTitle"
								autoFocus={true}
								className="selection:bg-gray-500 selection:text-white"
								value={boardTitle}
								onChange={(e) => setBoardTitle(e.target.value)}
								placeholder="Eg: Project X ..."
								required
							/>
						</div>

						<div className="flex items-center space-x-2">
							<input
								type="checkbox"
								id="createDefaultColumns"
								checked={createDefaultColumns}
								onChange={(e) => setCreateDefaultColumns(e.target.checked)}
								className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
							/>
							<Label
								htmlFor="createDefaultColumns"
								className="text-sm font-normal cursor-pointer">
								Create default columns (To Do, In Progress, Review, Done)
							</Label>
						</div>

						<div className="flex justify-end space-x-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setIsCreateDialogOpen(false);
									setBoardTitle('');
									setCreateDefaultColumns(true);
								}}>
								Cancel
							</Button>
							<Button
								className="focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary"
								type="submit"
								disabled={creatingBoard}>
								{creatingBoard ? (
									<>
										<Loader2 className="mr-2 w-4 h-4 animate-spin" />
										Creating...
									</>
								) : (
									'Create Board'
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
