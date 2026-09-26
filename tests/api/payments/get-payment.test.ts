/**
 * API tests for GET /api/payments/:id.
 *
 * RED-first: `app/api/payments/[id]/route.ts` does not exist yet. This
 * file is expected to fail (module not found / test collection failure)
 * until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: application getPayment(id) → HTTP response. The
 *   application-layer getPayment function (@/lib/application/get-payment,
 *   already established — see tests/application/get-payment.test.ts) is
 *   mocked, so no domain/application/infrastructure behavior runs here.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported GET handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ id: string }> }`), and its returned `Response`
 *   is inspected — same approach as get-student.test.ts,
 *   update-student.test.ts, and deactivate-student.test.ts.
 * - getPayment's dependencies contain only a paymentRepository (per the
 *   established application-layer contract), so only
 *   `@/lib/infrastructure/supabase/payment-repository` is mocked
 *   alongside the Supabase client — purely to keep this file's import
 *   chain from crashing before any test runs, since neither is itself
 *   under test here.
 * - No validation, pagination, filtering, or authorization behavior is
 *   tested.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';

// Mock the application-layer getPayment at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/get-payment', () => ({
	getPayment: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/payment-repository', () => ({
	SupabasePaymentRepository: vi.fn(),
}));

import { getPayment } from '@/lib/application/get-payment';
import { GET } from '@/app/api/payments/[id]/route';

const mockedGetPayment = vi.mocked(getPayment);

// --- Test setup -------------------------------------------------------

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

// Fields match the established Payment domain type exactly — see
// tests/application/get-payment.test.ts.
const payment: Payment = {
	id: 'payment-123',
	studentId: 'student-123',
	amount: 100000,
	paymentPeriod: new Date('2026-08-01'),
	paidAt: new Date('2026-08-05'),
	description: 'Pembayaran Agustus',
	createdAt: new Date('2026-08-05'),
	updatedAt: new Date('2026-08-05'),
};

beforeEach(() => {
	mockedGetPayment.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/payments/:id', () => {
	it('returns 200 and the payment as JSON when it exists', async () => {
		mockedGetPayment.mockResolvedValueOnce(payment);

		const response = await GET(
			new Request('http://localhost/api/payments/payment-123'),
			buildContext('payment-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(payment));

		expect(mockedGetPayment).toHaveBeenCalledTimes(1);
		const [id, dependencies] = mockedGetPayment.mock.calls[0];
		expect(id).toBe('payment-123');
		expect(dependencies).toEqual(
			expect.objectContaining({ paymentRepository: expect.anything() }),
		);
	});

	it('returns 404 when the payment does not exist', async () => {
		mockedGetPayment.mockRejectedValueOnce(new Error('Payment not found'));

		const response = await GET(
			new Request('http://localhost/api/payments/payment-123'),
			buildContext('payment-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'Payment not found' });
	});

	it('returns 500 for unexpected application errors', async () => {
		mockedGetPayment.mockRejectedValueOnce(new Error('unexpected failure'));

		const response = await GET(
			new Request('http://localhost/api/payments/payment-123'),
			buildContext('payment-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
