/**
 * API tests for POST /api/classes.
 *
 * RED-first: `app/api/classes/route.ts` does not exist yet. This file is
 * expected to fail (module not found / test collection failure) until
 * the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: request parsing/validation → application
 *   createClass() → HTTP response. The application-layer createClass
 *   function is mocked, so no domain/application/infrastructure behavior
 *   runs here (no trimming, UUID generation, status defaulting, type
 *   defaulting, or timestamp generation — those belong to the
 *   domain/application test suites already covering create-class).
 * - No real HTTP server is started. The route's exported POST handler is
 *   invoked directly with a standard Web `Request`, and its returned
 *   `Response` is inspected — the same approach Next.js App Router route
 *   handlers are naturally testable with.
 * - ASSUMPTION: the test environment provides the global Web `Request`/
 *   `Response` (e.g. Vitest's node/edge-runtime environment on Node 18+,
 *   or Next.js's own test setup). Not confirmed against this project's
 *   actual Vitest config, since it wasn't available to inspect.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client`, which calls
 *   `createClient(...)` at module load time using env vars that aren't
 *   set in the test environment. That module is mocked below purely to
 *   keep this file's import chain from crashing before any test runs —
 *   it is not itself under test here, since createClass (the actual
 *   collaborator this route is expected to call) is already mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';

// Mock the application-layer createClass at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/create-class', () => ({
	createClass: vi.fn(),
}));

// Prevent the route's transitive import of the real Supabase client from
// executing createClient(...) at module load time (see note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));

import { createClass } from '@/lib/application/create-class';
import { POST } from '@/app/api/classes/route';

const mockedCreateClass = vi.mocked(createClass);

// --- Test setup -------------------------------------------------------

function buildRequest(rawBody: string): Request {
	return new Request('http://localhost/api/classes', {
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

const minimalClass: Class = {
	id: 'class-123',
	name: 'Kelas 7A',
	type: 'GROUP',
	description: undefined,
	status: 'ACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

const fullClass: Class = {
	id: 'class-456',
	name: 'Privat Matematika',
	type: 'PRIVATE',
	description: 'Kelas privat',
	status: 'ACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

beforeEach(() => {
	mockedCreateClass.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('POST /api/classes', () => {
	it('creates a class with minimal valid input', async () => {
		mockedCreateClass.mockResolvedValueOnce(minimalClass);

		const response = await POST(buildJsonRequest({ name: 'Kelas 7A' }));
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(toJsonShape(minimalClass));
		expect(mockedCreateClass).toHaveBeenCalledTimes(1);

		const [input] = mockedCreateClass.mock.calls[0];
		expect(input).toMatchObject({ name: 'Kelas 7A' });
		// The API must not inject the domain default itself.
		expect(input.type).toBeUndefined();
		expect(input.description).toBeUndefined();
	});

	it('creates a class with all supported fields', async () => {
		mockedCreateClass.mockResolvedValueOnce(fullClass);

		const requestBody = {
			name: 'Privat Matematika',
			type: 'PRIVATE',
			description: 'Kelas privat',
		};
		const response = await POST(buildJsonRequest(requestBody));
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual(toJsonShape(fullClass));
		expect(mockedCreateClass).toHaveBeenCalledTimes(1);
		expect(mockedCreateClass.mock.calls[0][0]).toEqual(requestBody);
	});

	it('rejects a request with a missing name', async () => {
		const response = await POST(buildJsonRequest({}));

		expect(response.status).toBe(400);
		expect(mockedCreateClass).not.toHaveBeenCalled();
	});

	it('rejects a request with an invalid type', async () => {
		const response = await POST(
			buildJsonRequest({ name: 'Kelas 7A', type: 'INVALID' }),
		);

		expect(response.status).toBe(400);
		expect(mockedCreateClass).not.toHaveBeenCalled();
	});

	it('rejects malformed JSON', async () => {
		const response = await POST(buildRequest('{ this is not valid json'));

		expect(response.status).toBe(400);
		expect(mockedCreateClass).not.toHaveBeenCalled();
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedCreateClass.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await POST(buildJsonRequest({ name: 'Kelas 7A' }));

		expect(response.status).toBe(500);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Exact error response body shape for 400/500 responses (e.g. field
//    name for the error message, whether it's `{ error: string }` or
//    something else) — not established, so no assertion is made on
//    error response body content, only on status codes.
// 2. Whether the 500 response exposes any part of the underlying error —
//    the task explicitly says not to test for exposed internal details,
//    so this is left unasserted rather than assumed either way.
// 3. Which HTTP methods other than POST the route may support, and
//    whether unsupported methods return 404/405 — out of scope for this
//    file, which only covers POST.
// 4. How the route constructs its ClassRepository/dependency wiring for
//    createClass's second argument — since createClass itself is
//    mocked, this file makes no assertion about the second argument at
//    all.
