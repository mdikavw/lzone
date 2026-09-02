/**
 * Unit tests for the getPaymentsByStudentAndPeriod application use case.
 *
 * RED-first TDD: `@/lib/application/get-payments-by-student-and-period`
 * does not exist yet. This file is expected to fail (module not found /
 * test collection failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (PaymentRepository), not how it calls it internally.
 * - PaymentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - getPaymentsByStudentAndPeriod is a read-only lookup: forward
 *   studentId and paymentPeriod to findByStudentAndPeriod() as-is and
 *   return whatever it resolves to, unchanged. No date normalization,
 *   student-existence check, filtering, sorting, transformation, or
 *   pagination is assumed — findByStudentAndPeriod() is already the
 *   abstraction for this query; the use case only orchestrates the call.
 * - No write operation should ever be invoked.
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';
import { PaymentRepository } from '@/lib/repositories/payment-repository';
import { getPaymentsByStudentAndPeriod } from '@/lib/application/get-payments-by-student-and-period';

// --- Test setup -------------------------------------------------------

const studentId = 'student-123';
const paymentPeriod = new Date('2026-08-01');

// Two payments, same studentId and paymentPeriod — the multiplicity
// itself isn't a business rule being tested, just realistic fixture data
// for a Payment[]-returning method.
const payments: Payment[] = [
	{
		id: 'payment-123',
		studentId,
		amount: 100000,
		paymentPeriod,
		paidAt: new Date('2026-08-05'),
		description: 'Pembayaran Agustus',
		createdAt: new Date('2026-08-05'),
		updatedAt: new Date('2026-08-05'),
	},
	{
		id: 'payment-456',
		studentId,
		amount: 50000,
		paymentPeriod,
		paidAt: new Date('2026-08-20'),
		description: 'Pembayaran tambahan Agustus',
		createdAt: new Date('2026-08-20'),
		updatedAt: new Date('2026-08-20'),
	},
];

// Builds a fresh PaymentRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildPaymentRepository(
	overrides: Partial<PaymentRepository> = {},
): PaymentRepository {
	return {
		findById: vi.fn(),
		findByStudent: vi.fn(),
		findByStudentAndPeriod: vi.fn(async () => payments),
		findByPeriod: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetPaymentsByStudentAndPeriod — essential', () => {
	it('returns payments for the student and period', async () => {
		const paymentRepository = buildPaymentRepository();

		const result = await getPaymentsByStudentAndPeriod(
			{ studentId, paymentPeriod },
			{
				paymentRepository,
			},
		);

		expect(result).toBe(payments);
		expect(paymentRepository.findByStudentAndPeriod).toHaveBeenCalledWith(
			studentId,
			paymentPeriod,
		);
		expect(paymentRepository.create).not.toHaveBeenCalled();
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});

	it('returns an empty array when there are no payments', async () => {
		const paymentRepository = buildPaymentRepository({
			findByStudentAndPeriod: vi.fn(async () => []),
		});

		const result = await getPaymentsByStudentAndPeriod(
			{ studentId, paymentPeriod },
			{
				paymentRepository,
			},
		);

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
//    this use case per the given contract; not tested.
// 2. Date normalization (e.g. requiring paymentPeriod to be the first of
//    the month) — the given Date is forwarded to
//    findByStudentAndPeriod() as-is, so no normalization is tested here.
// 3. Sorting or limiting to the most recent payment when multiple exist
//    for the same student/period — not established, so the fixture
//    above deliberately provides two payments and asserts the full,
//    unmodified array is returned.
// 4. Duplicate-period business rules (as enforced by createPayment/
//    updatePayment) — not this use case's responsibility; not tested.
// 5. Authorization (e.g. whether the caller may view this student's
//    payments) — not established by anything shown.
