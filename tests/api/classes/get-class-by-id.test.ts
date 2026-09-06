/**
 * API tests for GET /api/classes/:id.
 *
 * RED-first: `app/api/classes/[id]/route.ts` does not exist yet. This
 * file is expected to fail (module not found / test collection failure)
 * until the route is implemented.
 *
 * Scope:
 * - HTTP boundary only: application getClass(id) → HTTP response. The
 *   application-layer getClass function (@/lib/application/get-class,
 *   already established — see tests/application/get-class.test.ts) is
 *   mocked, so no domain/application/infrastructure behavior runs here.
 * - Per the established getClass contract, its return type is
 *   Promise<Class> — it REJECTS with Error('Class not found') when the
 *   class doesn't exist, it never resolves to null. The route is
 *   expected to catch that rejection and translate it to a 404; any
 *   other rejected error is translated to a 500.
 * - No real HTTP server is started, and no real Supabase client is used
 *   (not even tests/integration/supabase/test-client.ts). The route's
 *   exported GET handler is invoked directly with a standard Web
 *   `Request` plus a Next.js 16 route context, and its returned
 *   `Response` is inspected.
 * - Next.js 16 App Router dynamic route params are async: the second
 *   handler argument is `{ params: Promise<{ id: string }> }`, so the
 *   route must await it. The mock context below reflects that.
 * - ASSUMPTION: the test environment provides the global Web `Request`/
 *   `Response` — same assumption as create-class.test.ts /
 *   get-classes.test.ts.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client`, which calls `createClient(...)`
 *   at module load time using env vars that aren't set in the test
 *   environment. That module is mocked below purely to keep this file's
 *   import chain from crashing before any test runs — it is not itself
 *   under test here, since getClass (the actual collaborator this route
 *   is expected to call) is already mocked. Same approach as the other
 *   API test files.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';

// Mock the application-layer getClass at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/get-class', () => ({
	getClass: vi.fn(),
}));

// Prevent the route's transitive import of the real Supabase client from
// executing createClient(...) at module load time (see note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));

import { getClass } from '@/lib/application/get-class';
import { GET } from '@/app/api/classes/[id]/route';

const mockedGetClass = vi.mocked(getClass);

// --- Test setup -------------------------------------------------------

function buildGetRequest(id: string): Request {
	return new Request(`http://localhost/api/classes/${id}`, { method: 'GET' });
}

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) };
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

const existingClass: Class = {
	id: 'class-123',
	name: 'Matematika Dasar',
	type: 'GROUP',
	description: 'Kelas matematika dasar',
	status: 'ACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

beforeEach(() => {
	mockedGetClass.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/classes/:id', () => {
	it('returns 200 and the class as JSON when the application layer resolves it', async () => {
		mockedGetClass.mockResolvedValueOnce(existingClass);

		const response = await GET(
			buildGetRequest('class-123'),
			buildContext('class-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(existingClass));
		expect(mockedGetClass).toHaveBeenCalledWith(
			'class-123',
			expect.anything(),
		);
	});

	it('returns 404 when the application layer reports the class was not found', async () => {
		mockedGetClass.mockRejectedValueOnce(new Error('Class not found'));

		const response = await GET(
			buildGetRequest('missing-id'),
			buildContext('missing-id'),
		);

		expect(response.status).toBe(404);
		expect(mockedGetClass).toHaveBeenCalledWith(
			'missing-id',
			expect.anything(),
		);
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedGetClass.mockRejectedValueOnce(new Error('unexpected failure'));

		const response = await GET(
			buildGetRequest('class-123'),
			buildContext('class-123'),
		);

		expect(response.status).toBe(500);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. How the route distinguishes "not found" (404) from other failures
//    (500) — this suite assumes it matches on the thrown error's message
//    ('Class not found'), consistent with getClass's established
//    behavior, but the exact mechanism (message match vs. a dedicated
//    error type) is the implementer's choice; only the resulting status
//    codes are asserted.
// 2. Exact error response body shape for 404/500 responses — not
//    established, so no assertion is made on error response body
//    content, only on status codes (consistent with the other API test
//    files).
// 3. Whether the 500 response exposes any part of the underlying error —
//    left unasserted rather than assumed either way.
// 4. Validation of the `id` path parameter itself (e.g. empty string,
//    unexpected format) — not established, so no such case is tested;
//    both fixtures here use plausible, non-empty ids.
