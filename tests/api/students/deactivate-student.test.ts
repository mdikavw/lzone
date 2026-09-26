/**
 * API tests for PATCH /api/students/:id/deactivate.
 *
 * RED-first: `app/api/students/[id]/deactivate/route.ts` does not exist
 * yet. This file is expected to fail (module not found / test
 * collection failure) until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: read URL id → application deactivateStudent() →
 *   HTTP response. The application-layer deactivateStudent function
 *   (@/lib/application/deactivate-student, already established — see
 *   tests/application/deactivate-student.test.ts) is mocked, so no
 *   domain/application/infrastructure behavior runs here. No business
 *   logic (already-inactive checks, field merging, etc.) is exercised —
 *   that belongs to deactivateStudent's own test suite.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported PATCH handler is invoked directly with a
 *   standard Web `Request` (no body — this endpoint doesn't need one)
 *   plus a Next.js 16 route context (`{ params: Promise<{ id: string }> }`),
 *   and its returned `Response` is inspected — same approach as
 *   get-student.test.ts and update-student.test.ts.
 * - deactivateStudent's dependencies contain only a studentRepository
 *   (no classRepository), so only
 *   `@/lib/infrastructure/supabase/student-repository` is mocked
 *   alongside the Supabase client — purely to keep this file's import
 *   chain from crashing before any test runs, since neither is itself
 *   under test here.
 * - No request body validation, class repository usage, pagination, or
 *   authorization behavior is tested.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';

// Mock the application-layer deactivateStudent at the module boundary —
// the route is expected to import and call this directly.
vi.mock('@/lib/application/deactivate-student', () => ({
	deactivateStudent: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/student-repository', () => ({
	SupabaseStudentRepository: vi.fn(),
}));

import { deactivateStudent } from '@/lib/application/deactivate-student';
import { PATCH } from '@/app/api/students/[id]/deactivate/route';

const mockedDeactivateStudent = vi.mocked(deactivateStudent);

// --- Test setup -------------------------------------------------------

function buildPatchRequest(id: string): Request {
	return new Request(`http://localhost/api/students/${id}/deactivate`, {
		method: 'PATCH',
	});
}

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

const student: Student = {
	id: 'student-123',
	name: 'Budi Santoso',
	phone: '081234567890',
	email: 'budi@example.com',
	status: 'INACTIVE',
	classId: 'class-123',
	billingType: 'MONTHLY',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

beforeEach(() => {
	mockedDeactivateStudent.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('PATCH /api/students/:id/deactivate', () => {
	it('returns 200 and the deactivated student', async () => {
		mockedDeactivateStudent.mockResolvedValueOnce(student);

		const response = await PATCH(
			buildPatchRequest('student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(student));

		expect(mockedDeactivateStudent).toHaveBeenCalledTimes(1);
		const [id, dependencies] = mockedDeactivateStudent.mock.calls[0];
		expect(id).toBe('student-123');
		expect(dependencies).toEqual(
			expect.objectContaining({ studentRepository: expect.anything() }),
		);
	});

	it('returns 404 when the student does not exist', async () => {
		mockedDeactivateStudent.mockRejectedValueOnce(
			new Error('Student not found'),
		);

		const response = await PATCH(
			buildPatchRequest('student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'Student not found' });
	});

	it('returns 400 when the student is already inactive', async () => {
		mockedDeactivateStudent.mockRejectedValueOnce(
			new Error('Student is already inactive'),
		);

		const response = await PATCH(
			buildPatchRequest('student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: 'Student is already inactive' });
	});

	it('returns 500 for unexpected application errors', async () => {
		mockedDeactivateStudent.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await PATCH(
			buildPatchRequest('student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
