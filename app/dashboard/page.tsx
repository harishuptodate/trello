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
import { useBoards } from '@/lib/hooks/useBoards';
import { Board } from '@/lib/supabase/models';
import { useUser } from '@clerk/nextjs';
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
import React, { useState, useEffect } from 'react';

export default function DashboardPage() {
	const { user } = useUser();
	const { createBoard, boards, loading, error, updateBoard, deleteBoard } =
		useBoards();
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [isFilterOpen, setIsFilterOpen] = useState(false);
	const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [editingBoard, setEditingBoard] = useState<Board | null>(null);
	const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);
	const [editTitle, setEditTitle] = useState('');
	const [editColor, setEditColor] = useState('');
	const [boardTitle, setBoardTitle] = useState('');
	const [createDefaultColumns, setCreateDefaultColumns] = useState(true);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

	const filteredBoards = boards.filter((board: Board) => {
		if (!board || !board.title) return false;

		const matchesSearch = board.title
			.toLowerCase()
			.includes(filters.search.toLowerCase());
		const matchesDateRange =
			!filters.dataRange.start ||
			(new Date(board.created_at) >= new Date(filters.dataRange.start) &&
				(!filters.dataRange.end ||
					new Date(board.created_at) <= new Date(filters.dataRange.end)));
		return matchesSearch && matchesDateRange;
	});

	const handleCreateBoard = async (e: React.FormEvent) => {
		e.preventDefault();
		await createBoard({
			title: boardTitle,
			createDefaultColumns,
		});
		setBoardTitle('');
		setCreateDefaultColumns(true);
		setIsCreateDialogOpen(false);
	};

	const handleEditBoard = (board: Board, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setEditingBoard(board);
		setEditTitle(board.title);
		setEditColor(board.color);
		setIsEditDialogOpen(true);
		setOpenDropdownId(null);
	};

	const handleDeleteBoard = (board: Board, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDeletingBoard(board);
		setIsDeleteDialogOpen(true);
		setOpenDropdownId(null);
	};

	const handleUpdateBoard = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingBoard || !editTitle.trim()) return;
		try {
			await updateBoard(editingBoard.id, {
				title: editTitle.trim(),
				color: editColor || editingBoard.color,
			});
			setIsEditDialogOpen(false);
			setEditingBoard(null);
			setEditTitle('');
			setEditColor('');
		} catch (error) {
			console.error('Error updating board:', error);
		}
	};

	const handleConfirmDelete = async () => {
		if (!deletingBoard) return;
		try {
			await deleteBoard(deletingBoard.id);
			setIsDeleteDialogOpen(false);
			setDeletingBoard(null);
		} catch (error) {
			console.error('Error deleting board:', error);
		}
	};

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

	function clearFilters() {
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
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen gap-2">
				<Loader2 className="animate-spin h-10 w-10 text-blue-600" />
				<span className="text-lg font-medium text-gray-900">
					Loading your boards...
				</span>
			</div>
		);
	}
	if (error) {
		return (
			<div className="flex items-center justify-center h-screen gap-2">
				<Loader2 className="animate-spin h-10 w-10 text-blue-600" />
				<span className="text-lg font-medium text-gray-900">
					Error loading boards
				</span>
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
				onCreateBoardClick={() => setIsCreateDialogOpen(true)}
			/>
			<main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
				<div className="mb-4 sm:mb-6">
					<h1 className="text-xl sm:text-2xl font-bold text-gray-900">
						Welcome back,{' '}
						{user?.firstName ??
							user?.emailAddresses[0].emailAddress.split('@')[0]}
						! 👋
					</h1>
					<p className="text-sm text-gray-600">
						Here's whats's hapening with your boards today.
					</p>
				</div>

				{/* Stats*/}
				{/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs sm:text-sm font-medium text-gray-600">
										Total Boards
									</p>
									<p className="text-xl sm:text-2xl font-bold text-gray-900">
										{boards.length}
									</p>
								</div>
								<div className="h-10 w-10 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
									<Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs sm:text-sm font-medium text-gray-600">
										Active Projects
									</p>
									<p className="text-xl sm:text-2xl font-bold text-gray-900">
										{boards.length}
									</p>
								</div>
								<div className="h-10 w-10 sm:w-12 bg-green-100 rounded-lg flex items-center justify-center">
									<Rocket />
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs sm:text-sm font-medium text-gray-600">
										Recent Activity
									</p>
									<p className="text-xl sm:text-2xl font-bold text-gray-900">
										{
											boards.filter((board) => {
												if (!board || !board.updated_at) return false;
												const updatedAt = new Date(board.updated_at);
												const oneWeekAgo = new Date();
												oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
												return updatedAt > oneWeekAgo;
											}).length
										}
									</p>
								</div>
								<div className="h-10 w-10 sm:w-12 bg-purple-200 rounded-lg flex items-center justify-center">
									<div className="text-xl sm:text-2xl ">📊</div>
								</div>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 sm:p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs sm:text-sm font-medium text-gray-600">
										Total Boards
									</p>
									<p className="text-xl sm:text-2xl font-bold text-gray-900">
										{boards.length}
									</p>
								</div>
								<div className="h-10 w-10 sm:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
									<Trello className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
								</div>
							</div>
						</CardContent>
					</Card>
				</div> */}
				{/* Boards */}
				<div className="mb-4 sm:mb-6">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
						<div>
							<h2 className="text-lg sm:text-xl font-bold text-gray-900">
								Your Boards
							</h2>
							<p className="text-sm text-gray-600">
								Manage your projects and tasks
							</p>
						</div>
						<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
							{/* View Toggle */}
							<div className="flex items-center space-x-2 rounded bg-white border p-1">
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
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
							{filteredBoards.map((board, key) => (
								<div key={key} className="relative">
									<Link href={`/boards/${board.id}`}>
										<Card className="hover:shadow-lg transition-shadow cursor-pointer group">
											<CardHeader className="pb-3">
												<div className="flex items-center justify-between">
													<div className={`w-4 h-4 ${board.color} rounded`} />
													<div className="flex items-center gap-2">
														<div className="relative">
															<Button
																variant="ghost"
																size="sm"
																className="h-7 w-7 shrink-0 p-0"
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
																<div className="absolute right-0 top-8 z-50 w-40 bg-white border rounded-md shadow-lg">
																	<button
																		className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
																		onClick={(e) => handleEditBoard(board, e)}>
																		<Edit className="h-4 w-4" />
																		Edit
																	</button>
																	<button
																		className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
																		onClick={(e) =>
																			handleDeleteBoard(board, e)
																		}>
																		<Trash2 className="h-4 w-4" />
																		Delete
																	</button>
																</div>
															)}
														</div>
													</div>
												</div>
											</CardHeader>
											<CardContent className="p-4 sm:p-6">
												<CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
													{board.title}
												</CardTitle>
												<CardDescription className="text-sm mb-4">
													{board.description}
												</CardDescription>
												<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
													<span>
														Created{' '}
														{new Date(board.created_at).toLocaleDateString()}
													</span>
													<span>
														Updated{' '}
														{new Date(board.updated_at).toLocaleDateString()}
													</span>
												</div>
											</CardContent>
										</Card>
									</Link>
								</div>
							))}
							<Card
								onClick={() => {
									setIsCreateDialogOpen(true);
								}}
								className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
								<CardContent className="p-3 sm:p-6 flex flex-col items-center justify-center h-full">
									<Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
									<p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">
										Create new board
									</p>
								</CardContent>
							</Card>
						</div>
					) : (
						<div>
							{filteredBoards.map((board, key) => (
								<div key={key} className={key > 0 ? 'mt-4' : ''}>
									<div className="relative">
										<Link href={`/boards/${board.id}`}>
											<Card className="hover:shadow-lg transition-shadow cursor-pointer group">
												<CardHeader className="pb-3">
													<div className="flex items-center justify-between">
														<div className={`w-4 h-4 ${board.color} rounded`} />
														<div className="flex items-center gap-2">
															{new Date(board.created_at) <
															new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) ? (
																<Badge className="text-xs" variant="secondary">
																	New
																</Badge>
															) : null}
															<div className="relative">
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-7 w-7 shrink-0 p-0"
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
																	<div className="absolute right-0 top-8 z-50 w-40 bg-white border rounded-md shadow-lg">
																		<button
																			className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
																			onClick={(e) =>
																				handleEditBoard(board, e)
																			}>
																			<Edit className="h-4 w-4" />
																			Edit
																		</button>
																		<button
																			className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
																			onClick={(e) =>
																				handleDeleteBoard(board, e)
																			}>
																			<Trash2 className="h-4 w-4" />
																			Delete
																		</button>
																	</div>
																)}
															</div>
														</div>
													</div>
												</CardHeader>
												<CardContent className="p-4 sm:p-6">
													<CardTitle className="text-base sm:text-lg mb-2 group-hover:text-blue-600 transition-colors">
														{board.title}
													</CardTitle>
													<CardDescription className="text-sm mb-4">
														{board.description}
													</CardDescription>
													<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
														<span>
															Created{' '}
															{new Date(board.created_at).toLocaleDateString()}
														</span>
														<span>
															Updated{' '}
															{new Date(board.updated_at).toLocaleDateString()}
														</span>
													</div>
												</CardContent>
											</Card>
										</Link>
									</div>
								</div>
							))}
							<Card onClick={() => {
									setIsCreateDialogOpen(true);
								}} className="mt-4 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors cursor-pointer group">
								<CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
									<Plus className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-2" />
									<p className="text-sm sm:text-base text-gray-600 group-hover:text-blue-600 font-medium">
										Create new board
									</p>
								</CardContent>
							</Card>
						</div>
					)}
				</div>
			</main>
			<Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Filter Boards</DialogTitle>
						<p>Filter boards by title, date, or task count</p>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2 space-x-2">
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
							<div className="grid grid-cols-1 sm:grid-cols-2  items-center  justify-between space-x-2">
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
								<div className="space-y-1 ">
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
							<div className="grid grid-cols-1 sm:grid-cols-2 items-center justify-between space-x-2">
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
						<div className="flex flex-col sm:flex-row pt-4 space-y-2 sm:space-y-0 justify-between sm:space-x-2">
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
				<DialogContent className="w-[95vw] max-w-425px mx-auto">
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
							<div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
								type="submit">
								Save Changes
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
			{/* Delete Confirmation Dialog */}
			<Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
				<DialogContent className="w-[95vw] max-w-425px mx-auto">
					<DialogHeader>
						<DialogTitle>Delete Board</DialogTitle>
						<p className="text-sm text-gray-600">
							Are you sure you want to delete "{deletingBoard?.title}"? This
							action cannot be undone.
						</p>
					</DialogHeader>
					<div className="flex justify-end space-x-2 pt-4">
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
							onClick={handleConfirmDelete}>
							Delete
						</Button>
					</div>
				</DialogContent>
			</Dialog>
			{/* create Board */}

			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="w-[95vw] max-w-425px mx-auto">
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
								className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
								type="submit">
								Create Board
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
