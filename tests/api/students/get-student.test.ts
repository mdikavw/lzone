/**
 * API tests for GET /api/students/:id.
 *
 * RED-first: `app/api/students/[id]/route.ts` does not exist yet. This
 * file is expected to fail (module not found / test collection failure)
 * until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: application getStudent(id) → HTTP response. The
 *   application-layer getStudent function is mocked, so no
 *   domain/application/infrastructure behavior runs here.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported GET handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ id: string }> }`), and its returned `Response`
 *   is inspected — same approach as the Class API tests.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client`, which is mocked below purely
 *   to keep this file's import chain from crashing before any test runs
 *   (it calls createClient(...) at module load time using env vars that
 *   aren't set in the test environment) — it is not itself under test
 *   here, since getStudent is already mocked.
 * - No validation, pagination, or authorization behavior is added beyond
 *   what's specified.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';

// Mock the application-layer getStudent at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/get-student', () => ({
	getStudent: vi.fn(),
}));

// Prevent the route's transitive import of the real Supabase client from
// executing createClient(...) at module load time (see note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));

import { getStudent } from '@/lib/application/get-student';
import { GET } from '@/app/api/students/[id]/route';

const mockedGetStudent = vi.mocked(getStudent);

// --- Test setup -------------------------------------------------------

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
	phone: '081298765432',
	email: 'budi@example.com',
	status: 'ACTIVE',
	classId: 'class-123',
	billingType: 'MONTHLY',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

beforeEach(() => {
	mockedGetStudent.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/students/:id', () => {
	it('returns 200 and the student as JSON when it exists', async () => {
		mockedGetStudent.mockResolvedValueOnce(student);

		const response = await GET(
			new Request('http://localhost/api/students/student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(student));

		expect(mockedGetStudent).toHaveBeenCalledTimes(1);
		const [id, dependencies] = mockedGetStudent.mock.calls[0];
		expect(id).toBe('student-123');
		expect(dependencies).toEqual(
			expect.objectContaining({ studentRepository: expect.anything() }),
		);
	});

	it('returns 404 when the student does not exist', async () => {
		mockedGetStudent.mockRejectedValueOnce(new Error('Student not found'));

		const response = await GET(
			new Request('http://localhost/api/students/student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'Student not found' });
	});

	it('returns 500 for unexpected application errors', async () => {
		mockedGetStudent.mockRejectedValueOnce(new Error('unexpected failure'));

		const response = await GET(
			new Request('http://localhost/api/students/student-123'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
