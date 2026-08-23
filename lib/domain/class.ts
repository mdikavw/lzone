export type ClassStatus = 'ACTIVE' | 'INACTIVE';
export type ClassType = 'PRIVATE' | 'GROUP';

export interface Class {
	id: string;
	name: string;
	type: ClassType;
	description?: string;
	status: ClassStatus;
	createdAt: Date;
	updatedAt: Date;
}

interface CreateClassInput {
	name: string;
	description?: string;
	type?: ClassType;
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
		type: input.type ?? 'GROUP',
		status: 'ACTIVE',
		createdAt: now,
		updatedAt: now,
	};
}
