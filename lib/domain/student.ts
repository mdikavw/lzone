export type StudentStatus = 'ACTIVE' | 'INACTIVE';

export interface Student {
	id: string;
	name: string;
	phone: string;
	email?: string;
	status: StudentStatus;
	createdAt: Date;
	updatedAt: Date;
}

interface CreateStudentInput {
	name: string;
	phone: string;
	email?: string;
}

export function createStudent(input: CreateStudentInput): Student {
	if (!input.name.trim()) {
		throw new Error('Student name is required');
	}

	if (!input.phone.trim()) {
		throw new Error('Student phone is required');
	}
	const now = new Date();

	return {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		phone: input.phone.trim(),
		email: input.email?.trim() || undefined,
		status: 'ACTIVE',
		createdAt: now,
		updatedAt: now,
	};
}
