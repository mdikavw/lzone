/**
 * API tests for GET /api/payments/student/:studentId.
 *
 * RED-first: `app/api/payments/student/[studentId]/route.ts` does not
 * exist yet. This file is expected to fail (module not found / test
 * collection failure) until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: application getPaymentsByStudent(studentId,
 *   dependencies) → HTTP response. The application-layer
 *   getPaymentsByStudent function (@/lib/application/get-payments-by-student,
 *   already established — see
 *   tests/application/get-payments-by-student.test.ts) is mocked, so no
 *   domain/application/infrastructure behavior runs here.
 * - CONTRACT FOUND: getPaymentsByStudent(studentId, { paymentRepository }):
 *   Promise<Payment[]>. It is read-only and forwards whatever
 *   paymentRepository.findByStudent(studentId) resolves to, unchanged —
 *   no filtering, sorting, or transformation. Critically, its established
 *   test suite does NOT check that the student exists first (that's
 *   explicitly listed as an ambiguity there, not a tested behavior), so
 *   this use case never throws a "not found" error for an unknown
 *   student — it simply resolves to an empty array. That's why there is
 *   no 404 test case in this file: nothing in the established contract
 *   produces one.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported GET handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ studentId: string }> }`), and its returned
 *   `Response` is inspected — same approach as get-payment.test.ts.
 * - getPaymentsByStudent's dependencies contain only a
 *   paymentRepository, so only
 *   `@/lib/infrastructure/supabase/payment-repository` is mocked
 *   alongside the Supabase client — purely to keep this file's import
 *   chain from crashing before any test runs, since neither is itself
 *   under test here.
 * - No validation, pagination, filtering, or authorization behavior is
 *   tested.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Payment } from '@/lib/domain/payment';

// Mock the application-layer getPaymentsByStudent at the module
// boundary — the route is expected to import and call this directly.
vi.mock('@/lib/application/get-payments-by-student', () => ({
	getPaymentsByStudent: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/payment-repository', () => ({
	SupabasePaymentRepository: vi.fn(),
}));

import { getPaymentsByStudent } from '@/lib/application/get-payments-by-student';
import { GET } from '@/app/api/payments/student/[studentId]/route';

const mockedGetPaymentsByStudent = vi.mocked(getPaymentsByStudent);

// --- Test setup -------------------------------------------------------

function buildContext(studentId: string) {
	return { params: Promise.resolve({ studentId }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

// Fields match the established Payment domain type exactly — see
// tests/application/get-payments-by-student.test.ts.
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

beforeEach(() => {
	mockedGetPaymentsByStudent.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/payments/student/:studentId', () => {
	it('returns 200 and the payments for the student', async () => {
		mockedGetPaymentsByStudent.mockResolvedValueOnce(payments);

		const response = await GET(
			new Request('http://localhost/api/payments/student/student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(payments));

		expect(mockedGetPaymentsByStudent).toHaveBeenCalledTimes(1);
		const [studentId, dependencies] =
			mockedGetPaymentsByStudent.mock.calls[0];
		expect(studentId).toBe('student-123');
		expect(dependencies).toEqual(
			expect.objectContaining({ paymentRepository: expect.anything() }),
		);
	});

	it('returns 200 and an empty array when the student has no payments', async () => {
		mockedGetPaymentsByStudent.mockResolvedValueOnce([]);

		const response = await GET(
			new Request('http://localhost/api/payments/student/student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual([]);
	});

	it('returns 500 for unexpected application errors', async () => {
		mockedGetPaymentsByStudent.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await GET(
			new Request('http://localhost/api/payments/student/student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
