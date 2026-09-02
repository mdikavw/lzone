/**
 * API tests for GET /api/classes.
 *
 * RED-first: `app/api/classes/route.ts` is not expected to export a GET
 * handler yet. This file is expected to fail until it does.
 *
 * Scope:
 * - HTTP boundary only: application getClasses() → HTTP response. The
 *   application-layer getClasses function (@/lib/application/get-classes,
 *   already established — see tests/application/get-classes.test.ts) is
 *   mocked, so no domain/application/infrastructure behavior runs here.
 * - No real HTTP server is started, and no real Supabase client is used
 *   (not even tests/integration/supabase/test-client.ts). The route's
 *   exported GET handler is invoked directly with a standard Web
 *   `Request`, and its returned `Response` is inspected.
 * - ASSUMPTION: the test environment provides the global Web `Request`/
 *   `Response` (e.g. Vitest's node/edge-runtime environment on Node 18+,
 *   or Next.js's own test setup) — same assumption as
 *   create-class.test.ts.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client`, which calls `createClient(...)`
 *   at module load time using env vars that aren't set in the test
 *   environment. That module is mocked below purely to keep this file's
 *   import chain from crashing before any test runs — it is not itself
 *   under test here, since getClasses (the actual collaborator this
 *   route is expected to call) is already mocked. Same approach as
 *   create-class.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';

// Mock the application-layer getClasses at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/get-classes', () => ({
	getClasses: vi.fn(),
}));

// Prevent the route's transitive import of the real Supabase client from
// executing createClient(...) at module load time (see note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));

import { getClasses } from '@/lib/application/get-classes';
import { GET } from '@/app/api/classes/route';

const mockedGetClasses = vi.mocked(getClasses);

// --- Test setup -------------------------------------------------------

function buildGetRequest(): Request {
	return new Request('http://localhost/api/classes', { method: 'GET' });
}

// Round-trips Date fields through JSON, matching what an HTTP response
// body actually contains after serialization.
function toJsonShape<T>(value: T): unknown {
	return JSON.parse(JSON.stringify(value));
}

const classes: Class[] = [
	{
		id: 'class-123',
		name: 'Matematika Dasar',
		type: 'GROUP',
		description: 'Kelas matematika dasar',
		status: 'ACTIVE',
		createdAt: new Date('2026-01-10'),
		updatedAt: new Date('2026-01-10'),
	},
	{
		id: 'class-456',
		name: 'Bahasa Inggris Privat',
		type: 'PRIVATE',
		description: undefined,
		status: 'INACTIVE',
		createdAt: new Date('2026-01-11'),
		updatedAt: new Date('2026-01-11'),
	},
];

beforeEach(() => {
	mockedGetClasses.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('GET /api/classes', () => {
	it('returns 200 and the list of classes when the application layer returns several', async () => {
		mockedGetClasses.mockResolvedValueOnce(classes);

		const response = await GET(buildGetRequest());
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual(toJsonShape(classes));
		expect(mockedGetClasses).toHaveBeenCalledTimes(1);
	});

	it('returns 200 and an empty array when the application layer returns no classes', async () => {
		mockedGetClasses.mockResolvedValueOnce([]);

		const response = await GET(buildGetRequest());
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual([]);
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedGetClasses.mockRejectedValueOnce(new Error('unexpected failure'));

		const response = await GET(buildGetRequest());

		expect(response.status).toBe(500);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Exact error response body shape for the 500 response — not
//    established, so no assertion is made on error response body
//    content, only on the status code (consistent with
//    create-class.test.ts).
// 2. Whether the 500 response exposes any part of the underlying error —
//    left unasserted rather than assumed either way.
// 3. Query parameters (e.g. filtering, pagination) on GET /api/classes —
//    nothing in the established getClasses contract supports this, so
//    no query string is sent and no such behavior is tested.
// 4. Which HTTP methods other than GET the route may support at this
//    same path, and how they're dispatched — out of scope for this
//    file, which only covers GET.
