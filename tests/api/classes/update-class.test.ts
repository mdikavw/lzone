/**
 * API tests for PUT /api/classes/:id.
 *
 * RED-first: `app/api/classes/[id]/route.ts` is not expected to export a
 * PUT handler yet. This file is expected to fail until it does.
 *
 * Scope:
 * - HTTP boundary only: parse/validate HTTP input → application
 *   updateClass() → HTTP response. The application-layer updateClass
 *   function (@/lib/application/update-class, already established — see
 *   tests/application/update-class.test.ts) is mocked, so no
 *   domain/application/infrastructure behavior runs here.
 * - CONTRACT: updateClass(id, input, dependency): Promise<Class>. The
 *   route does NOT build a full Class object. It:
 *     1. Reads `id` from the URL param.
 *     2. Parses/validates the request body as the editable fields only
 *        — { name, type, description?, status } — with no `id`,
 *        `createdAt`, or `updatedAt`.
 *     3. Calls updateClass(id, input, dependency), passing the URL id
 *        and the parsed body as two separate arguments.
 *   Building the full persisted Class (preserving id/createdAt from the
 *   existing record, generating a new updatedAt) is the application
 *   layer's responsibility — see tests/application/update-class.test.ts
 *   — not the route's. This file makes no assertion about Date
 *   construction at all.
 * - No real HTTP server is started, and no real Supabase client is used.
 *   The route's exported PUT handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ id: string }> }`), and its returned `Response`
 *   is inspected.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client` and
 *   `@/lib/infrastructure/supabase/class-repository`, both of which are
 *   mocked below purely to keep this file's import chain from crashing
 *   before any test runs — neither is itself under test here, since
 *   updateClass (the actual collaborator this route is expected to
 *   call) is already mocked. Same approach as the other API test files.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';

// Mock the application-layer updateClass at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/update-class', () => ({
	updateClass: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/class-repository', () => ({
	SupabaseClassRepository: vi.fn(),
}));

import { updateClass } from '@/lib/application/update-class';
import { PUT } from '@/app/api/classes/[id]/route';

const mockedUpdateClass = vi.mocked(updateClass);

// --- Test setup -------------------------------------------------------

function buildPutRequest(id: string, rawBody: string): Request {
	return new Request(`http://localhost/api/classes/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: rawBody,
	});
}

function buildJsonPutRequest(id: string, body: unknown): Request {
	return buildPutRequest(id, JSON.stringify(body));
}

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

// Request body: editable fields only, exactly what updateClass's `input`
// parameter accepts. No id, no createdAt/updatedAt.
const fullClassBody = {
	name: 'Matematika Lanjutan',
	type: 'GROUP',
	description: 'Kelas lanjutan matematika',
	status: 'ACTIVE',
};

// What the application layer resolves to (a real domain Class) — the
// route only forwards this in the response, it doesn't construct it.
const updatedClass: Class = {
	id: 'class-123',
	name: 'Matematika Lanjutan',
	type: 'GROUP',
	description: 'Kelas lanjutan matematika',
	status: 'ACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-02-01'),
};

beforeEach(() => {
	mockedUpdateClass.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('PUT /api/classes/:id', () => {
	it('returns 200 and the updated class as JSON for a valid update', async () => {
		mockedUpdateClass.mockResolvedValueOnce(updatedClass);

		const response = await PUT(
			buildJsonPutRequest('class-123', fullClassBody),
			buildContext('class-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(updatedClass));

		expect(mockedUpdateClass).toHaveBeenCalledTimes(1);
		const [id, input] = mockedUpdateClass.mock.calls[0];

		expect(id).toBe('class-123');
		expect(input).toEqual({
			name: 'Matematika Lanjutan',
			type: 'GROUP',
			description: 'Kelas lanjutan matematika',
			status: 'ACTIVE',
		});
	});

	it('returns 404 when the application layer reports the class was not found', async () => {
		mockedUpdateClass.mockRejectedValueOnce(new Error('Class not found'));

		const response = await PUT(
			buildJsonPutRequest('missing-id', fullClassBody),
			buildContext('missing-id'),
		);

		expect(response.status).toBe(404);
	});

	it('returns 400 when the request body does not represent valid editable fields', async () => {
		const response = await PUT(
			buildJsonPutRequest('class-123', {}),
			buildContext('class-123'),
		);

		expect(response.status).toBe(400);
		expect(mockedUpdateClass).not.toHaveBeenCalled();
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedUpdateClass.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await PUT(
			buildJsonPutRequest('class-123', fullClassBody),
			buildContext('class-123'),
		);

		expect(response.status).toBe(500);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. What exactly makes a body "invalid" — this suite only tests the
//    clearest case (`{}`, missing everything). Which specific fields are
//    strictly required by the route's own shape check (e.g. is
//    `description` required) is not established, so no finer-grained
//    validation case is tested.
// 2. Whether the route rejects (400) or ignores an `id`/`createdAt`/
//    `updatedAt` field if the client includes one in the body anyway —
//    not established, so not tested; the fixture body above simply never
//    includes them.
// 3. Malformed (unparsable) JSON body — a distinct failure mode from "a
//    parsable but incomplete body" (test 3 above); not included since it
//    wasn't part of the requested minimal test cases for this endpoint.
// 4. Exact error response body shape for 400/404/500 — not established,
//    so no assertion is made on error response body content, only on
//    status codes (consistent with the other API test files).
