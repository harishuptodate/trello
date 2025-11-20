import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const signupSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { email, password, name } = signupSchema.parse(body);

		// Check if user already exists
		const existingUser = await prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: 'User already exists' },
				{ status: 400 }, // status codes and their meanings: 200: OK, 201: Created, 204: No Content, 400: Bad Request, 401: Unauthorized, 403: Forbidden, 404: Not Found, 500: Internal Server Error
			);
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user
		const user = await prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name: name || null,
			},
		});

		return NextResponse.json(
			{ message: 'User created successfully', userId: user.id },
			{ status: 201 },
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.errors }, { status: 400 });
		}
		return NextResponse.json(
			{ error: 'Failed to create user' },
			{ status: 500 },
		);
	}
}
