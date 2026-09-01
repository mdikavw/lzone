/**
 * Unit tests for the deleteClass application use case.
 *
 * RED-first TDD: `@/lib/application/delete-class` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (ClassRepository), not how it calls it internally.
 * - ClassRepository is mocked — this is an application-layer unit test,
 *   not a Supabase integration test.
 * - Only tests: existence check via findById(id), delete(id) on success,
 *   "Class not found" rejection when absent. No soft-delete, status
 *   change, cascade, authorization, or other checks are assumed — none
 *   of that is established by the repository/domain contract.
 * - Call order between findById/delete is intentionally not asserted.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { deleteClass } from '@/lib/application/delete-class';

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
		delete: vi.fn(async () => undefined),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('DeleteClass — essential', () => {
	it('deletes an existing class', async () => {
		const classRepository = buildClassRepository();

		await expect(
			deleteClass('class-123', { classRepository }),
		).resolves.toBeUndefined();

		expect(classRepository.findById).toHaveBeenCalledWith('class-123');
		expect(classRepository.delete).toHaveBeenCalledWith('class-123');
	});

	it('rejects when the class does not exist', async () => {
		const classRepository = buildClassRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			deleteClass('class-123', { classRepository }),
		).rejects.toThrow('Class not found');
		expect(classRepository.delete).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Soft delete vs. hard delete — the repository contract exposes
//    delete(id): Promise<void> with no status-change alternative, so no
//    soft-delete or status-to-INACTIVE behavior is tested.
// 2. Whether a class with enrolled students, active payments, or other
//    related records can be deleted — no such check exists in the given
//    domain/repository, so nothing is tested either way.
// 3. Authorization — not established by anything shown.
// 4. Cascading deletes of related records — not part of the
//    ClassRepository contract, so not tested.
