/**
 * Unit tests for the updatePayment application use case.
 *
 * RED-first TDD: `@/lib/application/update-payment` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * DESIGN, per the established repository contract:
 *   update(payment: Payment): Promise<Payment>
 * Following the same pattern as updateStudent/updateClass, updatePayment
 * takes the FULL Payment entity (not a partial patch). The use case:
 *   1. Checks the payment exists via findById(input.id); throws
 *      "Payment not found" if it does not.
 *   2. Checks for a duplicate period, consistent with createPayment's
 *      existing duplicate-period rule: calls
 *      findByStudentAndPeriod(input.studentId, input.paymentPeriod) and
 *      throws "Payment already exists" if a match is found — UNLESS the
 *      only match is the payment being edited itself (same id).
 *   3. Forwards the given entity to paymentRepository.update() and
 *      returns its result.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (PaymentRepository), not how it calls it internally
 *   beyond the arguments that matter to callers.
 * - PaymentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - No normalization/validation behavior is assumed unless it is already
 *   established elsewhere (e.g. createPayment's amount validation is
 *   NOT assumed to apply here, since nothing establishes that update
 *   re-runs creation-time validation).
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';
import { PaymentRepository } from '@/lib/repositories/payment-repository';
import { updatePayment } from '@/lib/application/update-payment';

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

// The full entity the caller wants persisted, with several fields changed
// from existingPayment.
const updateInput: Payment = {
	id: 'payment-123',
	studentId: 'student-123',
	amount: 150000,
	paymentPeriod: new Date('2026-08-01'),
	paidAt: new Date('2026-08-10'),
	description: 'Pembayaran Agustus (revisi)',
	createdAt: new Date('2026-08-05'),
	updatedAt: new Date('2026-08-10'),
};

// Builds a fresh PaymentRepository mock so individual tests only need to
// override the method(s) relevant to that test. findById defaults to
// resolving the existing fixture, findByStudentAndPeriod defaults to an
// empty array (no conflicting payment), and update() defaults to echoing
// back whatever it received — matching the create-payment style.
function buildPaymentRepository(
	overrides: Partial<PaymentRepository> = {},
): PaymentRepository {
	return {
		findById: vi.fn(async () => existingPayment),
		findByStudent: vi.fn(),
		findByStudentAndPeriod: vi.fn(async () => []),
		findByPeriod: vi.fn(),
		create: vi.fn(),
		update: vi.fn(async (p) => p as Payment),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('UpdatePayment — essential', () => {
	it('updates an existing payment with valid data', async () => {
		const updatedPayment: Payment = { ...updateInput };
		const paymentRepository = buildPaymentRepository({
			update: vi.fn(async () => updatedPayment),
		});

		const result = await updatePayment(updateInput, { paymentRepository });

		expect(paymentRepository.findById).toHaveBeenCalledWith(updateInput.id);
		expect(paymentRepository.update).toHaveBeenCalledWith(updateInput);
		expect(result).toBe(updatedPayment);
	});

	it('returns the result of the repository update operation', async () => {
		const dbResult: Payment = { ...updateInput, description: 'From DB' };
		const paymentRepository = buildPaymentRepository({
			update: vi.fn(async () => dbResult),
		});

		const result = await updatePayment(updateInput, { paymentRepository });

		expect(result).toBe(dbResult);
	});

	it('rejects when the payment does not exist', async () => {
		const paymentRepository = buildPaymentRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			updatePayment(updateInput, { paymentRepository }),
		).rejects.toThrow('Payment not found');
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});

	it('rejects when the new period duplicates another payment', async () => {
		const conflictingPayment: Payment = {
			...existingPayment,
			id: 'payment-999',
			paymentPeriod: new Date('2026-09-01'),
		};
		const input: Payment = {
			...updateInput,
			paymentPeriod: new Date('2026-09-01'),
		};
		const paymentRepository = buildPaymentRepository({
			findByStudentAndPeriod: vi.fn(async () => [conflictingPayment]),
		});

		await expect(
			updatePayment(input, { paymentRepository }),
		).rejects.toThrow('Payment already exists');
		expect(paymentRepository.findByStudentAndPeriod).toHaveBeenCalledWith(
			input.studentId,
			input.paymentPeriod,
		);
		expect(paymentRepository.update).not.toHaveBeenCalled();
	});

	it('allows the update when the only matching payment is itself', async () => {
		const selfMatch: Payment = { ...existingPayment, id: updateInput.id };
		const paymentRepository = buildPaymentRepository({
			findByStudentAndPeriod: vi.fn(async () => [selfMatch]),
		});

		await updatePayment(updateInput, { paymentRepository });

		expect(paymentRepository.update).toHaveBeenCalledWith(updateInput);
	});
});

// --- Optional tests -------------------------------------------------------
// Mechanical field pass-through, one field at a time, so a bug that drops
// or ignores a specific field is caught even if other fields happen to
// pass through correctly.

describe('UpdatePayment — optional', () => {
	it('passes a changed amount through to repository.update', async () => {
		const input: Payment = { ...existingPayment, amount: 175000 };
		const paymentRepository = buildPaymentRepository();

		await updatePayment(input, { paymentRepository });

		expect(paymentRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({ amount: 175000 }),
		);
	});

	it('passes a changed paidAt through to repository.update', async () => {
		const input: Payment = {
			...existingPayment,
			paidAt: new Date('2026-08-12'),
		};
		const paymentRepository = buildPaymentRepository();

		await updatePayment(input, { paymentRepository });

		expect(paymentRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({ paidAt: new Date('2026-08-12') }),
		);
	});

	it('passes a changed description through to repository.update', async () => {
		const input: Payment = {
			...existingPayment,
			description: 'Pembayaran Agustus (revisi)',
		};
		const paymentRepository = buildPaymentRepository();

		await updatePayment(input, { paymentRepository });

		expect(paymentRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({
				description: 'Pembayaran Agustus (revisi)',
			}),
		);
	});

	it('passes a changed paymentPeriod through to repository.update', async () => {
		const input: Payment = {
			...existingPayment,
			paymentPeriod: new Date('2026-09-01'),
		};
		const paymentRepository = buildPaymentRepository();

		await updatePayment(input, { paymentRepository });

		expect(paymentRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({ paymentPeriod: new Date('2026-09-01') }),
		);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether a payment can still be edited after some "paid/settled"
//    state — Payment has no status field in the given domain model, so
//    no such restriction is tested.
// 2. Whether amount must remain positive on update — createPayment
//    validates amount at creation time, but nothing establishes that
//    updatePayment re-runs that (or any) validation, so it is not
//    assumed or tested here.
// 3. Whether the referenced student is re-verified on update
//    (studentRepository.findById) — updatePayment's stated dependencies
//    are limited to PaymentRepository, so no student re-check is tested.
// 4. Timestamp generation/ownership (e.g. whether updatedAt should be
//    refreshed by the use case) — not established, so the entity is
//    assumed to be forwarded as given.
// 5. Authorization and repository/database error transformation — not
//    established by anything shown.
//
// (Duplicate-period checking is no longer listed here — it is now a
// tested requirement in the "essential" block above, consistent with
// createPayment's existing rule.)
