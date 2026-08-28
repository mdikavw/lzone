/**
 * Unit tests for the createPayment use case.
 *
 * Scope:
 * - Behavior-focused: verifies what createPayment does with its
 *   collaborators (StudentRepository, PaymentRepository), not how it
 *   calls them internally beyond the arguments that matter to callers.
 * - Repositories are mocked here (unlike the Supabase integration
 *   tests) since this is an application-layer use case, not a
 *   persistence adapter.
 * - No invented business rules beyond what existing behavior already
 *   establishes — see "Ambiguities not covered by tests" at the end.
 */

import { describe, expect, it, vi } from 'vitest';
import { Student } from '@/lib/domain/student';
import type { Payment } from '@/lib/domain/payment';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { PaymentRepository } from '@/lib/repositories/payment-repository';
import { createPayment } from '@/lib/application/create-payment';

// --- Test setup -------------------------------------------------------

const student: Student = {
	id: 'student-123',
	name: 'Budi',
	phone: '081234567890',
	status: 'ACTIVE',
	classId: 'class-123',
	billingType: 'MONTHLY',
	createdAt: new Date(),
	updatedAt: new Date(),
};

const payment = {
	studentId: 'student-123',
	amount: 100000,
	paymentPeriod: new Date(),
	paidAt: new Date(),
	description: undefined,
};

// Builds a fresh StudentRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildStudentRepository(
	overrides: Partial<StudentRepository> = {},
): StudentRepository {
	return {
		findById: vi.fn(async () => student),
		findAll: vi.fn(),
		findByClass: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// Builds a fresh PaymentRepository mock. findByStudentAndPeriod defaults to
// an empty array (no existing payment for the period), matching the
// Payment[] contract.
function buildPaymentRepository(
	overrides: Partial<PaymentRepository> = {},
): PaymentRepository {
	return {
		findById: vi.fn(),
		findByStudent: vi.fn(),
		findByStudentAndPeriod: vi.fn(async () => []),
		findByPeriod: vi.fn(),
		create: vi.fn(async (p) => p as Payment),
		update: vi.fn(),
		...overrides,
	};
}

function buildDuplicatePayment(overrides: Partial<Payment> = {}): Payment {
	return {
		...payment,
		id: 'payment-456',
		description: undefined,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------
// These verify the stated contract directly: successful creation, and
// each documented rejection path.

describe('CreatePayment — essential', () => {
	it('creates a monthly payment with valid data', async () => {
		const studentRepository = buildStudentRepository();
		const paymentRepository = buildPaymentRepository();

		const result = await createPayment(payment, {
			paymentRepository,
			studentRepository,
		});

		const normalizedPaymentPeriod = new Date(payment.paidAt);
		normalizedPaymentPeriod.setDate(1);

		expect(result.studentId).toBe('student-123');
		expect(studentRepository.findById).toHaveBeenCalledWith(student.id);
		expect(paymentRepository.findByStudentAndPeriod).toHaveBeenCalledWith(
			payment.studentId,
			normalizedPaymentPeriod,
		);
		expect(paymentRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				studentId: payment.studentId,
				amount: payment.amount,
				paymentPeriod: normalizedPaymentPeriod,
			}),
		);
	});

	it('rejects when student is not found', async () => {
		const studentRepository = buildStudentRepository({
			findById: vi.fn(async () => null),
		});
		const paymentRepository = buildPaymentRepository();

		await expect(
			createPayment(payment, { paymentRepository, studentRepository }),
		).rejects.toThrow('Student not found');
		expect(paymentRepository.create).not.toHaveBeenCalled();
	});

	it('rejects when payment amount is invalid', async () => {
		const invalidPayment = { ...payment, amount: -100000 };
		const studentRepository = buildStudentRepository();
		const paymentRepository = buildPaymentRepository();

		await expect(
			createPayment(invalidPayment, {
				paymentRepository,
				studentRepository,
			}),
		).rejects.toThrow('Payment amount is invalid');
		expect(paymentRepository.create).not.toHaveBeenCalled();
	});

	it('rejects when student already has a payment for the period', async () => {
		const duplicatePayment = buildDuplicatePayment();
		const studentRepository = buildStudentRepository();
		// findByStudentAndPeriod returns Payment[], so an existing match
		// must be wrapped in an array, not returned as a bare object.
		const paymentRepository = buildPaymentRepository({
			findByStudentAndPeriod: vi.fn(async () => [duplicatePayment]),
		});

		const normalizedPaymentPeriod = new Date(payment.paidAt);
		normalizedPaymentPeriod.setDate(1);

		await expect(
			createPayment(payment, { paymentRepository, studentRepository }),
		).rejects.toThrow('Payment already exists');
		expect(paymentRepository.findByStudentAndPeriod).toHaveBeenCalledWith(
			payment.studentId,
			normalizedPaymentPeriod,
		);
		expect(paymentRepository.create).not.toHaveBeenCalled();
	});
});

// --- Optional tests -------------------------------------------------------
// Field pass-through and normalization details that the essential tests
// touch indirectly but don't isolate on their own.

describe('CreatePayment — optional', () => {
	it('preserves an explicitly provided description', async () => {
		const paymentWithDescription = {
			...payment,
			description: 'Pembayaran Agustus',
		};
		const studentRepository = buildStudentRepository();
		const paymentRepository = buildPaymentRepository();

		await createPayment(paymentWithDescription, {
			paymentRepository,
			studentRepository,
		});

		expect(paymentRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ description: 'Pembayaran Agustus' }),
		);
	});

	it('normalizes paymentPeriod to the first day of the paidAt month', async () => {
		const firstDayOfMonth = new Date(payment.paidAt);
		firstDayOfMonth.setDate(1);
		const paymentMidMonth = { ...payment, paidAt: new Date('2026-08-15') };
		const studentRepository = buildStudentRepository();
		const paymentRepository = buildPaymentRepository();

		await createPayment(paymentMidMonth, {
			paymentRepository,
			studentRepository,
		});

		expect(paymentRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ paymentPeriod: firstDayOfMonth }),
		);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether amount === 0 is valid or invalid — only the negative-amount
//    case is an established rule ("Payment amount is invalid" test).
// 2. Whether a student with status INACTIVE can have a payment created —
//    no existing test or requirement establishes this either way.
// 3. What "duplicate" resolution looks like when findByStudentAndPeriod
//    returns more than one existing payment for the period — the current
//    rejection behavior is tested with exactly one existing payment.
