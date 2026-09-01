/**
 * Unit tests for the getClasses application use case.
 *
 * RED-first TDD: `@/lib/application/get-classes` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (ClassRepository), not how it calls it internally.
 * - ClassRepository is mocked — this is an application-layer unit test,
 *   not a Supabase integration test.
 * - getClasses is a read-only listing: return whatever findAll()
 *   resolves to, unchanged. No filtering (including by status), sorting,
 *   transformation, or pagination is assumed. No write operation should
 *   ever be invoked.
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { getClasses } from '@/lib/application/get-classes';

// --- Test setup -------------------------------------------------------

// Deliberately mixed types and statuses: getClasses must return
// findAll()'s result as-is, not filter by status or type.
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
		description: 'Kelas privat bahasa Inggris',
		status: 'INACTIVE',
		createdAt: new Date('2026-01-11'),
		updatedAt: new Date('2026-01-11'),
	},
];

// Builds a fresh ClassRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildClassRepository(
	overrides: Partial<ClassRepository> = {},
): ClassRepository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(async () => classes),
		findActive: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetClasses — essential', () => {
	it('returns all classes', async () => {
		const classRepository = buildClassRepository();

		const result = await getClasses({ classRepository });

		expect(result).toBe(classes);
		expect(classRepository.findAll).toHaveBeenCalled();
		expect(classRepository.create).not.toHaveBeenCalled();
		expect(classRepository.update).not.toHaveBeenCalled();
		expect(classRepository.delete).not.toHaveBeenCalled();
	});

	it('returns an empty array when there are no classes', async () => {
		const classRepository = buildClassRepository({
			findAll: vi.fn(async () => []),
		});

		const result = await getClasses({ classRepository });

		expect(result).toEqual([]);
		expect(classRepository.create).not.toHaveBeenCalled();
		expect(classRepository.update).not.toHaveBeenCalled();
		expect(classRepository.delete).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Filtering by status — findActive() exists on the repository as a
//    separate method for that purpose; getClasses is not assumed to
//    filter, which is why the fixture above deliberately mixes
//    ACTIVE/INACTIVE and GROUP/PRIVATE and asserts the full array is
//    returned unchanged.
// 2. Ordering of the returned list — not established, so no assertion is
//    made on result order beyond identity with the repository's return
//    value.
// 3. Authorization (e.g. whether the caller may list all classes) — not
//    established by anything shown.
