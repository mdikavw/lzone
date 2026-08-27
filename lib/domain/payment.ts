export interface Payment {
	id: string;
	studentId: string;
	amount: number;
	paymentPeriod: Date;
	paidAt: Date;
	description?: string;
	createdAt: Date;
	updatedAt: Date;
}

interface CreatePaymentInput {
	studentId: string;
	amount: number;
	paymentPeriod: Date;
	description?: string;
}

export function createPayment(input: CreatePaymentInput): Payment {
	if (!input.studentId.trim()) throw new Error('Student ID is required');

	if (input.amount <= 0)
		throw new Error('Payment amount must be greater than error');

	const now = new Date();

	const paymentPeriod = new Date(input.paymentPeriod);
	paymentPeriod.setDate(1);

	return {
		id: crypto.randomUUID(),
		studentId: input.studentId.trim(),
		amount: input.amount,
		paymentPeriod,
		paidAt: now,
		description: input.description?.trim() || undefined,
		createdAt: now,
		updatedAt: now,
	};
}
