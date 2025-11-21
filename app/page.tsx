'use client';

import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Home() {
	const { data: session } = useSession();
	const isLoggedIn = !!session;

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-500 via-white to-purple-500">
			<Navbar />
			<main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
				<div className="text-center max-w-2xl">
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4">
						Welcome to Trello Clone
					</h1>
					<p className="text-lg sm:text-xl text-gray-700 mb-8">
						Organize your projects, collaborate with your team, and get things
						done.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						{isLoggedIn ? (
							<Link href="/dashboard">
								<Button size="lg" className="w-full cursor-pointer sm:w-auto">
									Go to Dashboard
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</Link>
						) : (
							<>
								<Link href="/auth/signup">
									<Button size="lg" className="w-full sm:w-auto">
										Get Started
										<ArrowRight className="ml-2 h-4 w-4" />
									</Button>
								</Link>
								<Link href="/auth/signin">
									<Button
										size="lg"
										variant="outline"
										className="w-full sm:w-auto">
										Sign In
									</Button>
								</Link>
							</>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
