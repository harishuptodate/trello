'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import Link from 'next/link';
import { Github, Loader2, Eye, EyeOff } from 'lucide-react';

const FullPageLoader = () => (
	<div className="flex gap-2 justify-center items-center h-screen">
				<Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
				<span className="text-lg font-medium text-gray-900">
					Loading your boards...
				</span>
			</div>
);

export default function SignUpPage() {
	const router = useRouter();
	const { status } = useSession();
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (status === 'authenticated') {
			router.replace('/dashboard');
		}
	}, [status, router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (name.trim().length > 15) {
			setError('Name must be less than 15 characters');
			return;
		}

		if (name.trim().length < 2) {
			setError('Name must be at least 2 characters');
			return;
		}

		if (password !== confirmPassword) {
			setError('Passwords do not match');
			return;
		}

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, name: name || undefined }),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Failed to create account');
				return;
			}

			// Auto sign in after signup
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false,
			});

			if (result?.error) {
				setError('Account created but sign in failed. Please try signing in.');
			} else {
				router.push('/dashboard');
				router.refresh();
			}
		} catch (err) {
			setError('An error occurred. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleGitHubSignIn = async () => {
		setError('');
		await signIn('github', { callbackUrl: '/dashboard' });
	};

	if (status === 'loading' || status === 'authenticated') {
		return <FullPageLoader />;
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Sign Up</CardTitle>
					<CardDescription className="text-center">
						Create a new account to get started
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						{error && (
							<div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
								{error}
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">Name (Optional)</Label>
							<Input
								id="name"
								type="text"
								placeholder="John Doe"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<div className="relative">
								<Input
									id="password"
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									minLength={8}
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none">
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
							<p className="text-xs text-gray-500">
								Must be at least 8 characters
							</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Confirm Password</Label>
							<div className="relative">
								<Input
									id="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									required
									className="pr-10"
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none">
									{showConfirmPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Creating account...' : 'Sign Up'}
						</Button>
					</form>

					<div className="mt-4">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-white px-2 text-gray-500">
									Or continue with
								</span>
							</div>
						</div>

						<Button
							type="button"
							variant="outline"
							className="w-full mt-4"
							onClick={handleGitHubSignIn}>
							<Github className="mr-2 h-4 w-4" />
							Sign up with GitHub
						</Button>
					</div>

					<div className="mt-4 text-center text-sm">
						Already have an account?{' '}
						<Link href="/auth/signin" className="text-blue-600 hover:underline">
							Sign in
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
