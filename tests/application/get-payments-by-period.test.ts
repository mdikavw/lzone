/**
 * Unit tests for the getPaymentsByPeriod application use case.
 *
 * RED-first TDD: `@/lib/application/get-payments-by-period` does not
 * exist yet. This file is expected to fail (module not found / test
 * collection failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (PaymentRepository), not how it calls it internally.
 * - PaymentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - getPaymentsByPeriod is a read-only listing: forward the given Date
 *   to findByPeriod() as-is and return whatever it resolves to,
 *   unchanged. No date normalization, filtering, sorting,
 *   transformation, or pagination is assumed — period normalization
 *   (e.g. to the first of the month) belongs to logic that already
 *   establishes it, such as createPayment, not to this query use case.
 * - No write operation should ever be invoked.
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';
import { PaymentRepository } from '@/lib/repositories/payment-repository';
import { getPaymentsByPeriod } from '@/lib/application/get-payments-by-period';

// --- Test setup -------------------------------------------------------

const paymentPeriod = new Date('2026-08-01');

// Two different students, same paymentPeriod — proves the use case
// doesn't filter by student, only forwards the period.
const payments: Payment[] = [
	{
		id: 'payment-123',
		studentId: 'student-123',
		amount: 100000,
		paymentPeriod,
		paidAt: new Date('2026-08-05'),
		description: 'Pembayaran Agustus - Budi',
		createdAt: new Date('2026-08-05'),
		updatedAt: new Date('2026-08-05'),
	},
	{
		id: 'payment-456',
		studentId: 'student-456',
		amount: 150000,
		paymentPeriod,
		paidAt: new Date('2026-08-07'),
		description: 'Pembayaran Agustus - Siti',
		createdAt: new Date('2026-08-07'),
		updatedAt: new Date('2026-08-07'),
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
		findByStudentAndPeriod: vi.fn(),
		findByPeriod: vi.fn(async () => payments),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetPaymentsByPeriod — essential', () => {
	it('returns payments for the period', async () => {
		const paymentRepository = buildPaymentRepository();

		const result = await getPaymentsByPeriod(paymentPeriod, {
			paymentRepository,
		});

		expect(result).toBe(payments);
		expect(paymentRepository.findByPeriod).toHaveBeenCalledWith(
			paymentPeriod,
		);
		expect(paymentRepository.create).not.toHaveBeenCalled();
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});

	it('returns an empty array when there are no payments for the period', async () => {
		const paymentRepository = buildPaymentRepository({
			findByPeriod: vi.fn(async () => []),
		});

		const result = await getPaymentsByPeriod(paymentPeriod, {
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
// 1. Date normalization (e.g. to the first day of the month) — not this
//    use case's responsibility; the given Date is forwarded to
//    findByPeriod() as-is, so no normalization is tested here.
// 2. Filtering by student, sorting, or limiting to the most recent
//    payment — not established, so the fixture above deliberately mixes
//    two different students under the same period and asserts the full,
//    unmodified array is returned.
// 3. Authorization (e.g. whether the caller may view payments for this
//    period) — not established by anything shown.
