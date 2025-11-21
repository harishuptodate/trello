import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

// Lightweight auth config for middleware - doesn't import Prisma or bcrypt
// This only verifies existing sessions, doesn't authenticate new users
// GitHub provider is Edge-compatible and allows NextAuth to verify all session tokens
export const { auth } = NextAuth({
	providers: [
		GitHub({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		}),
	],
	pages: {
		signIn: '/auth/signin',
	},
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = token.id as string;
			}
			return session;
		},
	},
});
