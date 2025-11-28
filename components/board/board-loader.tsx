'use client';

import { Loader2 } from 'lucide-react';

type BoardLoaderProps = {
	message?: string;
};

export function BoardLoader({ message = 'Loading...' }: BoardLoaderProps) {
	return (
		<div className="flex justify-center items-center min-h-screen bg-gray-50">
			<div className="text-center">
				<Loader2 className="mx-auto mb-4 w-10 h-10 text-blue-600 animate-spin" />
				<p className="text-lg font-medium text-gray-900">{message}</p>
			</div>
		</div>
	);
}
