import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
	providers: [
		Credentials({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null;
				}

				const user = await prisma.user.findUnique({
					where: { email: credentials.email as string },
				});

				if (!user || !user.password) {
					return null;
				}

				const isPasswordValid = await bcrypt.compare(
					credentials.password as string,
					user.password,
				);

				if (!isPasswordValid) {
					return null;
				}

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					image: user.image,
				};
			},
		}),
		GitHub({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		}),
	],
	pages: {
		signIn: '/auth/signin',
	},
	callbacks: {
		async jwt({ token, user, trigger, session }) {
			if (user) {
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;
			}

			if (trigger === 'update' && session?.user) {
				// Keep token in sync when the client calls session.update()
				token.name = session.user.name ?? token.name;
				token.email = session.user.email ?? token.email;
				token.picture = session.user.image ?? token.picture;
			}

			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				session.user.id = token.id as string;
				session.user.name = token.name as string ?? '';
				session.user.email = token.email as string ?? '';
				session.user.image = token.picture as string ?? '';
			}
			return session;
		},
	},
});
