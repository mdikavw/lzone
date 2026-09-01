/**
 * Unit tests for the updateClass application use case.
 *
 * RED-first TDD: `@/lib/application/update-class` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * DESIGN, per the corrected repository contract:
 *   update(classEntity: Class): Promise<Class>
 * updateClass takes the FULL Class entity (not a partial patch). The use
 * case checks the class exists via findById(input.id), then forwards the
 * given entity to classRepository.update() and returns its result.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (ClassRepository), not how it calls it internally
 *   beyond the arguments that matter to callers.
 * - ClassRepository is mocked — this is an application-layer unit test,
 *   not a Supabase integration test.
 * - No normalization/validation behavior (trimming, blank-description
 *   handling, etc.) from the domain `createClass` factory is assumed to
 *   apply here — none of that is established for updateClass, so it is
 *   not tested.
 * - No new business rules invented — anything not established by the
 *   repository contract or explicitly confirmed is listed under
 *   "Ambiguities not covered by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { updateClass } from '@/lib/application/update-class';

// --- Test setup -------------------------------------------------------

// Prior stored state, returned by findById(). Values deliberately differ
// from updateInput below so tests can tell "existing" apart from "input".
const existingClass: Class = {
	id: 'class-123',
	name: 'Matematika Dasar',
	type: 'PRIVATE',
	description: 'Kelas privat matematika',
	status: 'INACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

// The full entity the caller wants persisted.
const updateInput: Class = {
	id: 'class-123',
	name: 'Matematika Lanjutan',
	type: 'GROUP',
	description: 'Kelas lanjutan matematika',
	status: 'ACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-02-01'),
};

// Builds a fresh ClassRepository mock so individual tests only need to
// override the method(s) relevant to that test. findById defaults to
// resolving the existing fixture; update() defaults to echoing back
// whatever it received, matching the create-payment/create-class style.
function buildClassRepository(
	overrides: Partial<ClassRepository> = {},
): ClassRepository {
	return {
		findById: vi.fn(async () => existingClass),
		findAll: vi.fn(),
		findActive: vi.fn(),
		create: vi.fn(),
		update: vi.fn(async (c) => c as Class),
		delete: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('UpdateClass — essential', () => {
	it('updates an existing class with valid data', async () => {
		const classRepository = buildClassRepository();

		await updateClass(updateInput, { classRepository });

		expect(classRepository.findById).toHaveBeenCalledWith(updateInput.id);
		expect(classRepository.update).toHaveBeenCalledWith(updateInput);
	});

	it('returns the result of the repository update operation', async () => {
		const dbResult: Class = { ...updateInput, name: 'From DB' };
		const classRepository = buildClassRepository({
			update: vi.fn(async () => dbResult),
		});

		const result = await updateClass(updateInput, { classRepository });

		expect(result).toBe(dbResult);
	});

	it('rejects when the class does not exist', async () => {
		const classRepository = buildClassRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			updateClass(updateInput, { classRepository }),
		).rejects.toThrow('Class not found');
		expect(classRepository.update).not.toHaveBeenCalled();
	});

	it('passes the given class entity fields through to repository.update', async () => {
		const classRepository = buildClassRepository();

		await updateClass(updateInput, { classRepository });

		expect(classRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({
				id: updateInput.id,
				name: updateInput.name,
				type: updateInput.type,
				description: updateInput.description,
				status: updateInput.status,
			}),
		);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Partial update — the corrected contract uses a full Class entity, so
//    no partial-patch behavior (preserving untouched fields, merging with
//    the existing record) applies or is tested.
// 2. Any normalization on update (name/description trimming, blank
//    description becoming undefined, etc.) — not established for
//    updateClass specifically, so not tested even though createClass has
//    similar behavior at creation time.
// 3. Duplicate class names — ClassRepository has no findByName() (or
//    equivalent), so no uniqueness check is tested.
// 4. Whether class type changes or status transitions are business-
//    restricted — nothing in the domain/repository establishes this.
// 5. Timestamp generation/ownership (e.g. whether updatedAt should be
//    refreshed by the use case) — not established, so the entity is
//    assumed to be forwarded as given, with no assertion on timestamp
//    semantics beyond that.
// 6. Authorization and repository/database error transformation — not
//    established by anything shown.
