/**
 * API tests for DELETE /api/classes/:id.
 *
 * RED-first: `app/api/classes/[id]/route.ts` currently exports GET and
 * PUT, but not DELETE. This file is expected to fail (no DELETE export)
 * until the handler is implemented.
 *
 * Scope:
 * - HTTP boundary only: read URL id → application deleteClass() → HTTP
 *   response. The application-layer deleteClass function
 *   (@/lib/application/delete-class, already established — see
 *   tests/application/delete-class.test.ts) is mocked, so no
 *   domain/application/infrastructure behavior runs here.
 * - No real HTTP server is started, and no real Supabase client is used.
 *   The route's exported DELETE handler is invoked directly with a
 *   standard Web `Request` plus a Next.js 16 route context
 *   (`{ params: Promise<{ id: string }> }`), and its returned `Response`
 *   is inspected.
 * - The route module transitively imports
 *   `@/lib/infrastructure/supabase/client` and
 *   `@/lib/infrastructure/supabase/class-repository`, both of which are
 *   mocked below purely to keep this file's import chain from crashing
 *   before any test runs — neither is itself under test here, since
 *   deleteClass (the actual collaborator this route is expected to
 *   call) is already mocked. Same approach as the other API test files.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the application-layer deleteClass at the module boundary — the
// route is expected to import and call this directly.
vi.mock('@/lib/application/delete-class', () => ({
	deleteClass: vi.fn(),
}));

// Prevent the route's transitive imports of real Supabase infrastructure
// from executing at module load time (see header note above).
vi.mock('@/lib/infrastructure/supabase/client', () => ({
	supabase: {},
}));
vi.mock('@/lib/infrastructure/supabase/class-repository', () => ({
	SupabaseClassRepository: vi.fn(),
}));

import { deleteClass } from '@/lib/application/delete-class';
import { DELETE } from '@/app/api/classes/[id]/route';

const mockedDeleteClass = vi.mocked(deleteClass);

// --- Test setup -------------------------------------------------------

function buildDeleteRequest(id: string): Request {
	return new Request(`http://localhost/api/classes/${id}`, {
		method: 'DELETE',
	});
}

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
	mockedDeleteClass.mockReset();
});

// --- Essential tests ----------------------------------------------------

describe('DELETE /api/classes/:id', () => {
	it('returns 204 when deletion succeeds', async () => {
		mockedDeleteClass.mockResolvedValueOnce(undefined);

		const response = await DELETE(
			buildDeleteRequest('class-123'),
			buildContext('class-123'),
		);
		const responseBody = await response.text();

		expect(response.status).toBe(204);
		expect(responseBody).toBe('');
		expect(mockedDeleteClass).toHaveBeenCalledTimes(1);
		expect(mockedDeleteClass).toHaveBeenCalledWith('class-123', {
			classRepository: expect.anything(),
		});
	});

	it('returns 404 when the class does not exist', async () => {
		mockedDeleteClass.mockRejectedValueOnce(new Error('Class not found'));

		const response = await DELETE(
			buildDeleteRequest('missing-id'),
			buildContext('missing-id'),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body).toEqual({ error: 'Class not found' });
	});

	it('returns 500 when the application layer fails unexpectedly', async () => {
		mockedDeleteClass.mockRejectedValueOnce(
			new Error('unexpected failure'),
		);

		const response = await DELETE(
			buildDeleteRequest('class-123'),
			buildContext('class-123'),
		);
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body).toEqual({ error: 'Internal server error' });
	});
});
