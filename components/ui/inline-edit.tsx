import { useState, useEffect, useRef } from 'react';
import { Input } from './input';
import { Textarea } from './textarea';
import { Button } from './button';
import { Pencil } from 'lucide-react';

type InlineEditProps = {
	value: string;
	onSave: (next: string) => Promise<void> | void;
	placeholder?: string;
	multiline?: boolean;
	label?: string;
	disabled?: boolean;
	initialEditing?: boolean;
	className?: string;
	saving?: boolean;
};

export function InlineEdit({
	value,
	onSave,
	placeholder,
	multiline = false,
	label,
	disabled = false,
	initialEditing = false,
	className = '',
	saving = false,
}: InlineEditProps) {
	const [editing, setEditing] = useState(initialEditing);
	const [draft, setDraft] = useState(value);
	const [error, setError] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const editRef = useRef<HTMLFormElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		setDraft(value);
	}, [value]);

	const reset = () => {
		setEditing(false);
		setDraft(value);
		setError('');
		setIsSaving(false);
	};

	const handleSave = async (e?: React.FormEvent | React.KeyboardEvent) => {
		e?.preventDefault();
		const trimmed = draft.trim();
		if (!trimmed && !multiline) {
			setError('Please enter a value.');
			return;
		}
		if (trimmed === value.trim()) {
			setEditing(false);
			return;
		}
		setError('');
		setEditing(false);
		setIsSaving(true);
		try {
			await onSave(trimmed);
		} catch (error) {
			console.error('Error saving:', error);
			setEditing(true);
			setIsSaving(false);
		} finally {
			setIsSaving(false);
		}
	};

	useEffect(() => {
		if (!editing) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (editRef.current && !editRef.current.contains(event.target as Node)) {
				handleSave();
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [editing, draft, value]);

	useEffect(() => {
		if (editing) {
			// Set cursor to end of text when editing starts
			const element = multiline ? textareaRef.current : inputRef.current;
			if (element) {
				const length = element.value.length;
				element.setSelectionRange(length, length);
			}
		}
	}, [editing, multiline]);

	if (editing) {
		return (
			<form
				ref={editRef}
				className={`flex items-center gap-2 ${className}`}
				onSubmit={handleSave}>
				{multiline ? (
					<Textarea
						ref={textareaRef}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={placeholder}
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter') handleSave();
							if (e.key === 'Escape') reset();
						}}
						className="flex-1 bg-blue-50 ring-2 ring-blue-200 focus-visible:ring-blue-500 focus-visible:ring-1"
					/>
				) : (
					<Input
						ref={inputRef}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={placeholder}
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								e.stopPropagation();
								handleSave(e);
							}
							if (e.key === 'Escape') reset();
						}}
						className="flex-1 h-9 bg-blue-50 ring-2 ring-blue-200 focus-visible:ring-blue-500 focus-visible:ring-1"
					/>
				)}
				{error && <p className="text-xs text-red-500 mt-1">{error}</p>}
				<Button
					className="h-7 px-3 shrink-0 sm:hidden"
					type="submit"
					size="sm"
					disabled={saving}>
					{saving ? 'Saving...' : 'Save'}
				</Button>
			</form>
		);
	}

	return (
		<div
			className={`group flex items-start justify-between gap-2 ${className} ${
				disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
			} ${isSaving ? 'opacity-60' : ''} ${
				isHovered && !disabled && !isSaving ? 'bg-gray-50 rounded-md' : ''
			}`}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			onClick={() => !disabled && !isSaving && setEditing(true)}>
			<div className="min-w-0 flex-1">
				{/* {label && (
					<p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
				)} */}
				<p className="text-md text-gray-900 whitespace-pre-wrap break-words">
					{isSaving ? draft : value || placeholder || '—'}
				</p>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className={`h-6 w-8 shrink-0 transition-opacity ${
					isHovered && !disabled && !isSaving ? 'opacity-100' : 'opacity-0'
				}`}
				onClick={(e) => {
					e.stopPropagation();
					!disabled && !isSaving && setEditing(true);
				}}
				disabled={disabled || isSaving}>
				<Pencil className="h-4 w-4" />
			</Button>
		</div>
	);
}
