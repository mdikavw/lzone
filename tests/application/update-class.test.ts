/**
 * Unit tests for the updateClass application use case.
 *
 * CONTRACT (revised): updateClass(id, input, dependency)
 *   - `id` identifies the class to update (comes from the caller, e.g.
 *     the API route's URL param — not from `input`).
 *   - `input` contains ONLY the editable fields:
 *       { name: string; type: ClassType; description?: string; status: ClassStatus }
 *     It does NOT include `id`, `createdAt`, or `updatedAt` — the type
 *     system itself prevents passing those, so no runtime test is needed
 *     to prove they're rejected if included.
 *   - Behavior:
 *     1. Fetch the existing class via classRepository.findById(id).
 *     2. If not found, throw Error('Class not found').
 *     3. Build the full persisted Class by merging: id and createdAt
 *        preserved from the existing record; name/type/description/
 *        status taken from input; updatedAt set to a new timestamp.
 *     4. Call classRepository.update() with that full Class and return
 *        its result.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (ClassRepository), not how it calls it internally.
 * - ClassRepository is mocked — this is an application-layer unit test,
 *   not a Supabase integration test.
 * - No new business rules invented — anything not established by this
 *   contract is listed under "Ambiguities not covered by tests" instead
 *   of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Class, ClassStatus, ClassType } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { updateClass } from '@/lib/application/update-class';

// --- Test setup -------------------------------------------------------

type UpdateClassInput = {
	name: string;
	type: ClassType;
	description?: string;
	status: ClassStatus;
};

// Prior stored state, returned by findById(). Values deliberately differ
// from updateInput below so "preserved" vs. "taken from input" fields
// are distinguishable in assertions.
const existingClass: Class = {
	id: 'class-123',
	name: 'Matematika Dasar',
	type: 'PRIVATE',
	description: 'Kelas privat matematika',
	status: 'INACTIVE',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

// Only the editable fields — no id, no createdAt/updatedAt.
const updateInput: UpdateClassInput = {
	name: 'Matematika Lanjutan',
	type: 'GROUP',
	description: 'Kelas lanjutan matematika',
	status: 'ACTIVE',
};

// Builds a fresh ClassRepository mock so individual tests only need to
// override the method(s) relevant to that test. findById defaults to
// resolving the existing fixture; update() defaults to echoing back
// whatever it received.
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
	it('merges the update input with the existing class and persists it', async () => {
		const classRepository = buildClassRepository();

		await updateClass('class-123', updateInput, { classRepository });

		expect(classRepository.findById).toHaveBeenCalledWith('class-123');
		expect(classRepository.update).toHaveBeenCalledTimes(1);

		const [persisted] = vi.mocked(classRepository.update).mock.calls[0];

		// Preserved from the existing record.
		expect(persisted.id).toBe(existingClass.id);
		expect(persisted.createdAt).toEqual(existingClass.createdAt);

		// Taken from the update input.
		expect(persisted.name).toBe(updateInput.name);
		expect(persisted.type).toBe(updateInput.type);
		expect(persisted.description).toBe(updateInput.description);
		expect(persisted.status).toBe(updateInput.status);

		// updatedAt is a new timestamp, not the preserved existing one.
		expect(persisted.updatedAt).toBeInstanceOf(Date);
		expect(persisted.updatedAt).not.toEqual(existingClass.updatedAt);
	});

	it('returns the result of the repository update operation', async () => {
		const dbResult: Class = { ...existingClass, name: 'From DB' };
		const classRepository = buildClassRepository({
			update: vi.fn(async () => dbResult),
		});

		const result = await updateClass('class-123', updateInput, {
			classRepository,
		});

		expect(result).toBe(dbResult);
	});

	it('rejects when the class does not exist', async () => {
		const classRepository = buildClassRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			updateClass('missing-id', updateInput, { classRepository }),
		).rejects.toThrow('Class not found');
		expect(classRepository.update).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether class type changes or status transitions are business-
//    restricted — nothing in the domain/repository establishes this.
// 2. Duplicate class names — ClassRepository has no findByName() (or
//    equivalent), so no uniqueness check is tested.
// 3. Whether `description` can be explicitly cleared (e.g. set to an
//    empty string or omitted to remove an existing value) versus simply
//    left absent — the input type marks it optional, but no trimming or
//    blank-to-undefined normalization is established for update (unlike
//    createClass's factory), so none is tested.
// 4. Authorization and repository/database error transformation — not
//    established by anything shown.
