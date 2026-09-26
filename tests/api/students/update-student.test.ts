/**
 * API tests for PUT /api/students/:id.
 *
 * RED-first: `app/api/students/[id]/route.ts` does not export a PUT
 * handler yet. This file is expected to fail until it does.
 *
 * Scope:
 * - HTTP boundary only: parse/validate HTTP input → application
 *   updateStudent() → HTTP response. The application-layer
 *   updateStudent function (@/lib/application/update-student, already
 *   established — see tests/application/update-student.test.ts) is
 *   mocked, so no domain/application/infrastructure behavior runs here.
 *   No business rules (class existence/active checks, etc.) are
 *   exercised — those belong to updateStudent's own test suite.
 * - No real HTTP server is started, and no real Supabase client is
 *   used. The route's exported PUT handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ id: string }> }`), and its returned `Response`
 *   is inspected — same approach as get-student.test.ts and the Class
 *   API tests.
 * - updateStudent's dependencies include both a studentRepository and a
 *   classRepository (consistent with its established application-layer
 *   contract), so both
 *   `@/lib/infrastructure/supabase/student-repository` and
 *   `@/lib/infrastructure/supabase/class-repository` are mocked below,
 *   alongside the Supabase client — purely to keep this file's import
 *   chain from crashing before any test runs, since none of them is
 *   itself under test here.
 * - No phone/email format validation or other rule beyond what's
 *   explicitly specified is added.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';

// Mock the application-layer updateStudent at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/update-student', () => ({
	updateStudent: vi.fn(),
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

import { updateStudent } from '@/lib/application/update-student';
import { PUT } from '@/app/api/students/[id]/route';

const mockedUpdateStudent = vi.mocked(updateStudent);

// --- Test setup -------------------------------------------------------

function buildRequest(id: string, rawBody: string): Request {
	return new Request(`http://localhost/api/students/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: rawBody,
	});
}

function buildJsonRequest(id: string, body: unknown): Request {
	return buildRequest(id, JSON.stringify(body));
}

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

const validRequestBody = {
	name: 'Budi Santoso Updated',
	phone: '081299999999',
	email: 'budi.updated@example.com',
	classId: 'class-456',
	status: 'ACTIVE',
};

const updatedStudent: Student = {
	id: 'student-123',
	name: 'Budi Santoso Updated',
	phone: '081299999999',
	email: 'budi.updated@example.com',
	status: 'ACTIVE',
	classId: 'class-456',
	billingType: 'MONTHLY',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-02-01'),
};

beforeEach(() => {
	mockedUpdateStudent.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('PUT /api/students/:id', () => {
	it('returns 200 and the updated student as JSON on success', async () => {
		mockedUpdateStudent.mockResolvedValueOnce(updatedStudent);

		const response = await PUT(
			buildJsonRequest('student-123', validRequestBody),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(updatedStudent));

		expect(mockedUpdateStudent).toHaveBeenCalledTimes(1);
		const [id, input, dependencies] = mockedUpdateStudent.mock.calls[0];
		expect(id).toBe('student-123');
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
		const response = await PUT(
			buildRequest('student-123', '{invalid'),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: 'Invalid JSON' });
		expect(mockedUpdateStudent).not.toHaveBeenCalled();
	});

	// --- Invalid input ----------------------------------------------------

	const invalidInputCases: Array<[string, unknown]> = [
		['body is null', null],
		['body is an array', ['not', 'an', 'object']],
		['body is a primitive string', 'just a string'],
		['name is empty', { ...validRequestBody, name: '' }],
		['name is whitespace only', { ...validRequestBody, name: '   ' }],
		['name is non-string', { ...validRequestBody, name: 123 }],
		['phone is missing', (() => {
			const { phone, ...rest } = validRequestBody;
			return rest;
		})()],
		['phone is non-string', { ...validRequestBody, phone: 12345 }],
		['classId is missing', (() => {
			const { classId, ...rest } = validRequestBody;
			return rest;
		})()],
		['classId is non-string', { ...validRequestBody, classId: 42 }],
		['status is invalid', { ...validRequestBody, status: 'UNKNOWN' }],
	];

	it.each(invalidInputCases)('returns 400 when %s', async (_description, invalidBody) => {
		const response = await PUT(
			buildJsonRequest('student-123', invalidBody),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: 'Invalid student input' });
		expect(mockedUpdateStudent).not.toHaveBeenCalled();
	});

	// --- Application errors -----------------------------------------------

	it('returns 404 when the student does not exist', async () => {
		mockedUpdateStudent.mockRejectedValueOnce(new Error('Student not found'));

		const response = await PUT(
			buildJsonRequest('student-123', validRequestBody),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'Student not found' });
	});

	it('returns 404 when the target class does not exist', async () => {
		mockedUpdateStudent.mockRejectedValueOnce(new Error('New class is not found'));

		const response = await PUT(
			buildJsonRequest('student-123', validRequestBody),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'New class is not found' });
	});

	it('returns 400 when the target class is inactive', async () => {
		mockedUpdateStudent.mockRejectedValueOnce(new Error('New class is inactive'));

		const response = await PUT(
			buildJsonRequest('student-123', validRequestBody),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body).toEqual({ error: 'New class is inactive' });
	});

	it('returns 500 for unexpected application errors', async () => {
		mockedUpdateStudent.mockRejectedValueOnce(new Error('unexpected failure'));

		const response = await PUT(
			buildJsonRequest('student-123', validRequestBody),
			buildContext('student-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});