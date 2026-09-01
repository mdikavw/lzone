/**
 * Unit tests for the getPaymentsByStudent application use case.
 *
 * RED-first TDD: `@/lib/application/get-payments-by-student` does not
 * exist yet. This file is expected to fail (module not found / test
 * collection failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (PaymentRepository), not how it calls it internally.
 * - PaymentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - getPaymentsByStudent is a read-only listing: return whatever
 *   findByStudent(studentId) resolves to, unchanged. No filtering,
 *   sorting, transformation, or pagination is assumed. No write
 *   operation should ever be invoked.
 * - No new business rules invented — student existence, filtering to a
 *   particular status, and similar concerns are out of scope for this
 *   use case per the given contract.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';
import { PaymentRepository } from '@/lib/repositories/payment-repository';
import { getPaymentsByStudent } from '@/lib/application/get-payments-by-student';

// --- Test setup -------------------------------------------------------

const payments: Payment[] = [
	{
		id: 'payment-123',
		studentId: 'student-123',
		amount: 100000,
		paymentPeriod: new Date('2026-08-01'),
		paidAt: new Date('2026-08-05'),
		description: 'Pembayaran Agustus',
		createdAt: new Date('2026-08-05'),
		updatedAt: new Date('2026-08-05'),
	},
	{
		id: 'payment-456',
		studentId: 'student-123',
		amount: 100000,
		paymentPeriod: new Date('2026-09-01'),
		paidAt: new Date('2026-09-04'),
		description: 'Pembayaran September',
		createdAt: new Date('2026-09-04'),
		updatedAt: new Date('2026-09-04'),
	},
];

// Builds a fresh PaymentRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildPaymentRepository(
	overrides: Partial<PaymentRepository> = {},
): PaymentRepository {
	return {
		findById: vi.fn(),
		findByStudent: vi.fn(async () => payments),
		findByStudentAndPeriod: vi.fn(),
		findByPeriod: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetPaymentsByStudent — essential', () => {
	it('returns payments for the student', async () => {
		const paymentRepository = buildPaymentRepository();

		const result = await getPaymentsByStudent('student-123', {
			paymentRepository,
		});

		expect(result).toBe(payments);
		expect(paymentRepository.findByStudent).toHaveBeenCalledWith(
			'student-123',
		);
		expect(paymentRepository.create).not.toHaveBeenCalled();
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});

	it('returns an empty array when the student has no payments', async () => {
		const paymentRepository = buildPaymentRepository({
			findByStudent: vi.fn(async () => []),
		});

		const result = await getPaymentsByStudent('student-123', {
			paymentRepository,
		});

		expect(result).toEqual([]);
		expect(paymentRepository.create).not.toHaveBeenCalled();
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether the referenced student must exist first — out of scope for
//    getPaymentsByStudent per the given contract; not tested.
// 2. Filtering, sorting (e.g. by paymentPeriod), or limiting to the most
//    recent payment — not established, so the fixture above deliberately
//    provides two payments in insertion order and asserts the full,
//    unmodified array is returned.
// 3. Authorization (e.g. whether the caller may view this student's
//    payments) — not established by anything shown.
