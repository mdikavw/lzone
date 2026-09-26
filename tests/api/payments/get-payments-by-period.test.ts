/**
 * API tests for GET /api/payments/period/:period.
 *
 * RED-first: `app/api/payments/period/[period]/route.ts` does not exist
 * yet. This file is expected to fail (module not found / test
 * collection failure) until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: application getPaymentsByPeriod(paymentPeriod,
 *   dependencies) → HTTP response. The application-layer
 *   getPaymentsByPeriod function (@/lib/application/get-payments-by-period,
 *   already established — see
 *   tests/application/get-payments-by-period.test.ts) is mocked, so no
 *   domain/application/infrastructure behavior runs here.
 * - CONTRACT FOUND: getPaymentsByPeriod(paymentPeriod: Date,
 *   { paymentRepository }): Promise<Payment[]>. It is read-only and
 *   forwards the given Date to findByPeriod() as-is — no normalization
 *   at the application layer. Its established test suite does not throw
 *   a "not found" error for a period with no matches — it simply
 *   resolves to an empty array — so there is no 404 test case here.
 * - PERIOD FORMAT (confirmed): the `:period` URL segment is a full ISO
 *   8601 datetime string, e.g. '2026-08-01T00:00:00.000Z'. Since the
 *   application layer expects a `Date` object (not a string), the route
 *   is expected to convert this string into a `Date` (e.g. via
 *   `new Date(period)`) before calling getPaymentsByPeriod(). That
 *   conversion is asserted directly below — this is not treated as
 *   unestablished/ambiguous.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported GET handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ period: string }> }`), and its returned
 *   `Response` is inspected — same approach as get-payment.test.ts and
 *   get-payments-by-student.test.ts.
 * - getPaymentsByPeriod's dependencies contain only a paymentRepository,
 *   so only `@/lib/infrastructure/supabase/payment-repository` is
 *   mocked alongside the Supabase client — purely to keep this file's
 *   import chain from crashing before any test runs, since neither is
 *   itself under test here.
 * - No validation, pagination, filtering, or authorization behavior is
 *   tested. No 400 case is included since date-string validation was
 *   not part of the requested test cases.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';

// Mock the application-layer getPaymentsByPeriod at the module
// boundary — the route is expected to import and call this directly.
vi.mock('@/lib/application/get-payments-by-period', () => ({
	getPaymentsByPeriod: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/payment-repository', () => ({
	SupabasePaymentRepository: vi.fn(),
}));

import { getPaymentsByPeriod } from '@/lib/application/get-payments-by-period';
import { GET } from '@/app/api/payments/period/[period]/route';

const mockedGetPaymentsByPeriod = vi.mocked(getPaymentsByPeriod);

// --- Test setup -------------------------------------------------------

const periodParam = '2026-08-01T00:00:00.000Z';

function buildContext(period: string) {
	return { params: Promise.resolve({ period }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

// Fields match the established Payment domain type exactly — see
// tests/application/get-payments-by-period.test.ts.
const payments: Payment[] = [
	{
		id: 'payment-123',
		studentId: 'student-123',
		amount: 100000,
		paymentPeriod: new Date(periodParam),
		paidAt: new Date('2026-08-05'),
		description: 'Pembayaran Agustus - Budi',
		createdAt: new Date('2026-08-05'),
		updatedAt: new Date('2026-08-05'),
	},
	{
		id: 'payment-456',
		studentId: 'student-456',
		amount: 150000,
		paymentPeriod: new Date(periodParam),
		paidAt: new Date('2026-08-07'),
		description: 'Pembayaran Agustus - Siti',
		createdAt: new Date('2026-08-07'),
		updatedAt: new Date('2026-08-07'),
	},
];

beforeEach(() => {
	mockedGetPaymentsByPeriod.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/payments/period/:period', () => {
	it('returns 200 and the payments for the requested period', async () => {
		mockedGetPaymentsByPeriod.mockResolvedValueOnce(payments);

		const response = await GET(
			new Request(
				`http://localhost/api/payments/period/${encodeURIComponent(periodParam)}`,
			),
			buildContext(periodParam),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(payments));

		expect(mockedGetPaymentsByPeriod).toHaveBeenCalledTimes(1);
		const [paymentPeriod, dependencies] =
			mockedGetPaymentsByPeriod.mock.calls[0];
		expect(paymentPeriod).toEqual(new Date(periodParam));
		expect(dependencies).toEqual(
			expect.objectContaining({ paymentRepository: expect.anything() }),
		);
	});

	it('returns 200 and an empty array when no payments match the period', async () => {
		mockedGetPaymentsByPeriod.mockResolvedValueOnce([]);

		const response = await GET(
			new Request(
				`http://localhost/api/payments/period/${encodeURIComponent(periodParam)}`,
			),
			buildContext(periodParam),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual([]);
	});

	it('returns 500 for unexpected application errors', async () => {
		mockedGetPaymentsByPeriod.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await GET(
			new Request(
				`http://localhost/api/payments/period/${encodeURIComponent(periodParam)}`,
			),
			buildContext(periodParam),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
