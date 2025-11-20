import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
	const { pathname } = req.nextUrl;

	// Public routes
	if (
		pathname === '/' ||
		pathname.startsWith('/auth/') ||
		pathname.startsWith('/api/auth/')
	) {
		return NextResponse.next();
	}

	// Protected routes - redirect to signin if not authenticated
	if (!req.auth && !pathname.startsWith('/api/auth/')) {
		const signInUrl = new URL('/auth/signin', req.url);
		signInUrl.searchParams.set('callbackUrl', pathname);
		return NextResponse.redirect(signInUrl);
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
};
