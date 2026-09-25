/**
 * API tests for GET /api/students.
 *
 * RED-first: `app/api/students/route.ts` does not exist yet (or does not
 * yet export GET). This file is expected to fail until it does.
 *
 * Scope:
 * - HTTP boundary only: application getStudents() → HTTP response. The
 *   application-layer getStudents function is mocked, so no
 *   domain/application/infrastructure behavior runs here. No filtering,
 *   pagination, or authorization is assumed — there are currently no
 *   query/filter requirements for this endpoint.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported GET handler is invoked directly with a
 *   standard Web `Request`, and its returned `Response` is inspected —
 *   same approach as the Class API tests.
 * - ASSUMPTION: the test environment provides the global Web `Request`/
 *   `Response` — same assumption as the Class API tests.
 * - `app/api/students/route.ts` also handles POST /api/students (create
 *   student), whose dependencies include both a studentRepository and a
 *   classRepository (see tests/api/create-student.test.ts). Since GET
 *   and POST share the same route module, importing it for this file
 *   triggers the same top-level infrastructure imports either way, so
 *   both `@/lib/infrastructure/supabase/student-repository` and
 *   `@/lib/infrastructure/supabase/class-repository` are mocked below
 *   alongside the Supabase client — purely to keep this file's import
 *   chain from crashing before any test runs. Same approach as the
 *   Class API tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';

// Mock the application-layer getStudents at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/get-students', () => ({
	getStudents: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/student-repository', () => ({
	SupabaseStudentRepository: vi.fn(),
}));
vi.mock('@/lib/infrastructure/supabase/class-repository', () => ({
	SupabaseClassRepository: vi.fn(),
}));

import { getStudents } from '@/lib/application/get-students';
import { GET } from '@/app/api/students/route';

const mockedGetStudents = vi.mocked(getStudents);

// --- Test setup -------------------------------------------------------

function buildGetRequest(): Request {
	return new Request('http://localhost/api/students', { method: 'GET' });
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

const students: Student[] = [
	{
		id: 'student-123',
		name: 'Budi Santoso',
		phone: '081298765432',
		email: 'budi@example.com',
		status: 'ACTIVE',
		classId: 'class-123',
		billingType: 'MONTHLY',
		createdAt: new Date('2026-01-10'),
		updatedAt: new Date('2026-01-10'),
	},
	{
		id: 'student-456',
		name: 'Siti Aminah',
		phone: '081234567891',
		status: 'INACTIVE',
		classId: 'class-456',
		billingType: 'PER_SESSION',
		createdAt: new Date('2026-01-11'),
		updatedAt: new Date('2026-01-11'),
	},
];

beforeEach(() => {
	mockedGetStudents.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/students', () => {
	it('returns 200 and the list of students when the application layer returns several', async () => {
		mockedGetStudents.mockResolvedValueOnce(students);

		const response = await GET(buildGetRequest());
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(students));

		expect(mockedGetStudents).toHaveBeenCalledTimes(1);
		const [dependencies] = mockedGetStudents.mock.calls[0];
		expect(dependencies).toEqual(
			expect.objectContaining({ studentRepository: expect.anything() }),
		);
	});

	it('returns 200 and an empty array when the application layer returns no students', async () => {
		mockedGetStudents.mockResolvedValueOnce([]);

		const response = await GET(buildGetRequest());
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual([]);
		expect(mockedGetStudents).toHaveBeenCalledTimes(1);
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedGetStudents.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await GET(buildGetRequest());
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
