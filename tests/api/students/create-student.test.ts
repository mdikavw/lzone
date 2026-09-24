/**
 * API tests for POST /api/students.
 *
 * RED-first: `app/api/students/route.ts` does not exist yet. This file
 * is expected to fail (module not found / test collection failure)
 * until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: parse/validate HTTP input → application
 *   createStudent() → HTTP response. The application-layer createStudent
 *   function is mocked, so no domain/application/infrastructure
 *   behavior runs here (no business rules — e.g. class existence/active
 *   checks — are exercised; those belong to createStudent's own test
 *   suite, not this one).
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported POST handler is invoked directly with a
 *   standard Web `Request`, and its returned `Response` is inspected —
 *   same approach as the Class API tests.
 * - ASSUMPTION: the test environment provides the global Web `Request`/
 *   `Response` — same assumption as the Class API tests.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client`,
 *   `@/lib/infrastructure/supabase/student-repository`, and
 *   `@/lib/infrastructure/supabase/class-repository` (createStudent's
 *   dependencies include both a studentRepository and a
 *   classRepository). All three are mocked below purely to keep this
 *   file's import chain from crashing before any test runs — none of
 *   them is itself under test here, since createStudent is already
 *   mocked. Same approach as the Class API tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';

// Mock the application-layer createStudent at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/create-student', () => ({
	createStudent: vi.fn(),
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

import { createStudent } from '@/lib/application/create-student';
import { POST } from '@/app/api/students/route';

const mockedCreateStudent = vi.mocked(createStudent);

// --- Test setup -------------------------------------------------------

function buildRequest(rawBody: string): Request {
	return new Request('http://localhost/api/students', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: rawBody,
	});
}

function buildJsonRequest(body: unknown): Request {
	return buildRequest(JSON.stringify(body));
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

const validRequestBody = {
	name: 'Budi Santoso',
	phone: '081298765432',
	email: 'budi@example.com',
	classId: 'class-123',
};

const createdStudent: Student = {
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
	mockedCreateStudent.mockReset();
});

// --- Essential tests: success --------------------------------------------

describe('POST /api/students', () => {
	it('creates a student with valid input', async () => {
		mockedCreateStudent.mockResolvedValueOnce(createdStudent);

		const response = await POST(buildJsonRequest(validRequestBody));
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(toJsonShape(createdStudent));

		expect(mockedCreateStudent).toHaveBeenCalledTimes(1);
		const [input, dependencies] = mockedCreateStudent.mock.calls[0];
		expect(input).toEqual(validRequestBody);
		expect(dependencies).toEqual(
			expect.objectContaining({
				studentRepository: expect.anything(),
				classRepository: expect.anything(),
			}),
		);
	});

	// --- Invalid JSON ---------------------------------------------------

	it('returns 400 when the request body is not valid JSON', async () => {
		const response = await POST(buildRequest('{ this is not valid json'));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: 'Invalid JSON' });
		expect(mockedCreateStudent).not.toHaveBeenCalled();
	});

	// --- Invalid input ----------------------------------------------------

	const invalidInputCases: Array<[string, unknown]> = [
		['body is null', null],
		['body is an array', ['not', 'an', 'object']],
		['body is a primitive string', 'just a string'],
		['name is missing', { phone: '081298765432', classId: 'class-123' }],
		[
			'name is non-string',
			{ name: 123, phone: '081298765432', classId: 'class-123' },
		],
		[
			'name is empty',
			{ name: '', phone: '081298765432', classId: 'class-123' },
		],
		[
			'name is whitespace only',
			{ name: '   ', phone: '081298765432', classId: 'class-123' },
		],
		['phone is missing', { name: 'Budi Santoso', classId: 'class-123' }],
		[
			'phone is non-string',
			{ name: 'Budi Santoso', phone: 12345, classId: 'class-123' },
		],
		['classId is missing', { name: 'Budi Santoso', phone: '081298765432' }],
		[
			'classId is non-string',
			{ name: 'Budi Santoso', phone: '081298765432', classId: 42 },
		],
	];

	it.each(invalidInputCases)(
		'returns 400 when %s',
		async (_description, invalidBody) => {
			const response = await POST(buildJsonRequest(invalidBody));
			const body = await response.json();

			expect(response.status).toBe(400);
			expect(body).toEqual({ error: 'Invalid student input' });
			expect(mockedCreateStudent).not.toHaveBeenCalled();
		},
	);

	// --- Application errors -----------------------------------------------

	it('returns 404 when the application layer reports the class was not found', async () => {
		mockedCreateStudent.mockRejectedValueOnce(new Error('Class not found'));

		const response = await POST(buildJsonRequest(validRequestBody));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'Class not found' });
	});

	it('returns 400 when the application layer reports the class is inactive', async () => {
		mockedCreateStudent.mockRejectedValueOnce(
			new Error('Class is inactive'),
		);

		const response = await POST(buildJsonRequest(validRequestBody));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: 'Class is inactive' });
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedCreateStudent.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await POST(buildJsonRequest(validRequestBody));
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether `email` is validated at the HTTP boundary (format, or
//    rejecting a non-string value) — not part of the specified invalid-
//    input cases, so not tested; email is optional per the domain model.
// 2. Whether unknown/extra fields in the body are rejected or silently
//    ignored — not specified, so not tested.
// 3. Validation order relative to JSON parsing (confirmed: malformed
//    JSON is checked first, per the "Invalid JSON" case using a request
//    whose body cannot be parsed at all) versus the order among the
//    individual field checks themselves — not specified beyond that, so
//    no assertion is made about which invalid field "wins" when several
//    are invalid at once.
