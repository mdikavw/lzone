/**
 * Unit tests for the getPayment application use case.
 *
 * RED-first TDD: `@/lib/application/get-payment` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (PaymentRepository), not how it calls it internally.
 * - PaymentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - getPayment is a read-only lookup: fetch by id, throw "Payment not
 *   found" when absent, otherwise return the repository's result as-is.
 *   No write operation (create/update) should ever be invoked.
 * - No new business rules invented — student existence, duplicate-period
 *   checking, amount/status validation, and similar concerns belong to
 *   other use cases (e.g. createPayment/updatePayment), not this one.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';
import { PaymentRepository } from '@/lib/repositories/payment-repository';
import { getPayment } from '@/lib/application/get-payment';

// --- Test setup -------------------------------------------------------

const existingPayment: Payment = {
	id: 'payment-123',
	studentId: 'student-123',
	amount: 100000,
	paymentPeriod: new Date('2026-08-01'),
	paidAt: new Date('2026-08-05'),
	description: 'Pembayaran Agustus',
	createdAt: new Date('2026-08-05'),
	updatedAt: new Date('2026-08-05'),
};

// Builds a fresh PaymentRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildPaymentRepository(
	overrides: Partial<PaymentRepository> = {},
): PaymentRepository {
	return {
		findById: vi.fn(async () => existingPayment),
		findByStudent: vi.fn(),
		findByStudentAndPeriod: vi.fn(),
		findByPeriod: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetPayment — essential', () => {
	it('returns the payment when it exists', async () => {
		const paymentRepository = buildPaymentRepository();

		const result = await getPayment('payment-123', { paymentRepository });

		expect(result).toBe(existingPayment);
		expect(paymentRepository.findById).toHaveBeenCalledWith('payment-123');
		expect(paymentRepository.create).not.toHaveBeenCalled();
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});

	it('rejects when the payment does not exist', async () => {
		const paymentRepository = buildPaymentRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			getPayment('payment-123', { paymentRepository }),
		).rejects.toThrow('Payment not found');
		expect(paymentRepository.create).not.toHaveBeenCalled();
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether the id argument is validated (e.g. format, empty string)
//    before being passed to findById — not established, so no such
//    validation is tested.
// 2. Whether the referenced student still exists — out of scope for
//    getPayment per the given contract; not tested.
// 3. Any notion of a payment being "valid", "expired", or otherwise
//    status-checked — Payment has no such field in the given domain
//    model, so nothing is tested here.
// 4. Authorization (e.g. whether the caller may view this particular
//    payment) — not established by anything shown.
