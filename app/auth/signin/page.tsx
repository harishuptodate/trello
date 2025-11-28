'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Github, Loader2 } from 'lucide-react';

const FullPageLoader = () => (
	<div className="flex gap-2 justify-center items-center h-screen">
				<Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
				<span className="text-lg font-medium text-gray-900">
					Loading your boards...
				</span>
			</div>
);

function SignInForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { status } = useSession();
	const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
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
		setLoading(true);

		try {
			const result = await signIn('credentials', {
				email,
				password,
				redirect: false,
			});

			if (result?.error) {
				setError('Invalid email or password');
			} else {
				router.push(callbackUrl);
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
		await signIn('github', { callbackUrl });
	};

	if (status === 'loading' || status === 'authenticated') {
		return <FullPageLoader />;
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-2xl text-center">Sign In</CardTitle>
					<CardDescription className="text-center">
						Enter your credentials to access your account
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
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
							/>
						</div>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? 'Signing in...' : 'Sign In'}
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
							Sign in with GitHub
						</Button>
					</div>

					<div className="mt-4 text-center text-sm">
						Don't have an account?{' '}
						<Link href="/auth/signup" className="text-blue-600 hover:underline">
							Sign up
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={<div className="min-h-screen animate-pulse flex items-center justify-center bg-gray-50">Loading...</div>}>
			<SignInForm />
		</Suspense>
	);
}
