export type StudentStatus = 'ACTIVE' | 'INACTIVE';
export type BillingType = 'MONTHLY' | 'PER_SESSION';

export interface Student {
	id: string;
	name: string;
	phone: string;
	email?: string;
	status: StudentStatus;
	classId: string;
	billingType: BillingType;
	createdAt: Date;
	updatedAt: Date;
}

interface CreateStudentInput {
	name: string;
	phone: string;
	classId: string;
	email?: string;
	billingType?: BillingType;
}

export function createStudent(input: CreateStudentInput): Student {
	if (!input.name.trim()) {
		throw new Error('Student name is required');
	}

	if (!input.phone.trim()) {
		throw new Error('Student phone is required');
	}

	if (!input.classId.trim()) {
		throw new Error('Class is required');
	}

	const now = new Date();

	return {
		id: crypto.randomUUID(),
		name: input.name.trim(),
		phone: input.phone.trim(),
		email: input.email?.trim() || undefined,
		status: 'ACTIVE',
		classId: input.classId.trim(),
		billingType: input.billingType ?? 'MONTHLY',
		createdAt: now,
		updatedAt: now,
	};
}
