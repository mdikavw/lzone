/**
 * Unit tests for the getClass application use case.
 *
 * RED-first TDD: `@/lib/application/get-class` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (ClassRepository), not how it calls it internally.
 * - ClassRepository is mocked — this is an application-layer unit test,
 *   not a Supabase integration test.
 * - getClass is a read-only lookup: fetch by id, throw "Class not found"
 *   when absent, otherwise return the repository's result as-is. No
 *   write operation (create/update/delete) should ever be invoked.
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { getClass } from '@/lib/application/get-class';

// --- Test setup -------------------------------------------------------

const existingClass: Class = {
	id: 'class-123',
	name: 'Matematika Dasar',
	type: 'GROUP',
	description: 'Kelas matematika dasar',
	status: 'ACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

// Builds a fresh ClassRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildClassRepository(
	overrides: Partial<ClassRepository> = {},
): ClassRepository {
	return {
		findById: vi.fn(async () => existingClass),
		findAll: vi.fn(),
		findActive: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetClass — essential', () => {
	it('returns the class when it exists', async () => {
		const classRepository = buildClassRepository();

		const result = await getClass('class-123', { classRepository });

		expect(result).toBe(existingClass);
		expect(classRepository.findById).toHaveBeenCalledWith('class-123');
		expect(classRepository.create).not.toHaveBeenCalled();
		expect(classRepository.update).not.toHaveBeenCalled();
		expect(classRepository.delete).not.toHaveBeenCalled();
	});

	it('rejects when the class does not exist', async () => {
		const classRepository = buildClassRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			getClass('class-123', { classRepository }),
		).rejects.toThrow('Class not found');
		expect(classRepository.create).not.toHaveBeenCalled();
		expect(classRepository.update).not.toHaveBeenCalled();
		expect(classRepository.delete).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether the id argument is validated (e.g. format, empty string)
//    before being passed to findById — nothing in the repository/domain
//    establishes this, so no such validation is tested.
// 2. Whether an INACTIVE class is still returned by getClass, or treated
//    as "not found" — nothing establishes a status filter here, so no
//    such rule is tested; the fixture above uses ACTIVE only for
//    simplicity, not to imply a restriction.
// 3. Authorization (e.g. whether the caller may view this particular
//    class) — not established by anything shown.
