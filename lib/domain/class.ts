export type ClassStatus = 'ACTIVE' | 'INACTIVE';

export interface Class {
	id: string;
	name: string;
	description?: string;
	status: ClassStatus;
	createdAt: Date;
	updatedAt: Date;
}

interface CreateClassInput {
	name: string;
	description?: string;
}

export function createClass(input: CreateClassInput): Class {
	if (!input.name.trim()) {
		throw new Error('Class name is required');
	}

	const now = new Date();

	return {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		description: input.description?.trim() || undefined,
		status: 'ACTIVE',
		createdAt: now,
		updatedAt: now,
	};
}
