/**
 * Unit tests for the createClass application use case.
 *
 * RED-first TDD: `@/lib/application/create-class` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the createClass use case does with
 *   its collaborator (ClassRepository), not how it calls it internally
 *   beyond the arguments that matter to callers.
 * - ClassRepository is mocked here — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - Only tests behavior already established by the existing domain
 *   `createClass` factory (@/lib/domain/class) and the ClassRepository
 *   contract: name required, name/description trimming, description
 *   omitted when blank, type defaulting to 'GROUP', status defaulting
 *   to 'ACTIVE'. No new business rules are invented.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Class } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { createClass } from '@/lib/application/create-class';

// --- Test setup -------------------------------------------------------

const classInput = {
	name: 'Matematika Dasar',
	description: 'Kelas untuk siswa SD',
};

// Builds a fresh ClassRepository mock so individual tests only need to
// override the method(s) relevant to that test. create() defaults to
// echoing back whatever it received, matching the create-payment test style.
function buildClassRepository(
	overrides: Partial<ClassRepository> = {},
): ClassRepository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(),
		findActive: vi.fn(),
		create: vi.fn(async (c) => c as Class),
		update: vi.fn(),
		delete: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------
// These verify the stated contract directly: successful creation, and
// the one rejection path already established by the domain factory
// (name required).

describe('CreateClass — essential', () => {
	it('creates a class with valid data', async () => {
		const classRepository = buildClassRepository();

		const result = await createClass(classInput, { classRepository });

		expect(result.name).toBe('Matematika Dasar');
		expect(classRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Matematika Dasar',
				description: 'Kelas untuk siswa SD',
				type: 'GROUP',
				status: 'ACTIVE',
			}),
		);
	});

	it('rejects when name is empty', async () => {
		const invalidInput = { ...classInput, name: '' };
		const classRepository = buildClassRepository();

		await expect(
			createClass(invalidInput, { classRepository }),
		).rejects.toThrow('Class name is required');
		expect(classRepository.create).not.toHaveBeenCalled();
	});

	it('rejects when name is only whitespace', async () => {
		const invalidInput = { ...classInput, name: '   ' };
		const classRepository = buildClassRepository();

		await expect(
			createClass(invalidInput, { classRepository }),
		).rejects.toThrow('Class name is required');
		expect(classRepository.create).not.toHaveBeenCalled();
	});
});

// --- Optional tests -------------------------------------------------------
// Normalization/defaulting details already established by the domain
// `createClass` factory, exercised here through the application use case.

describe('CreateClass — optional', () => {
	it('preserves an explicitly provided type', async () => {
		const privateClassInput = { ...classInput, type: 'PRIVATE' as const };
		const classRepository = buildClassRepository();

		await createClass(privateClassInput, { classRepository });

		expect(classRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'PRIVATE' }),
		);
	});

	it('defaults to GROUP when type is not provided', async () => {
		const classRepository = buildClassRepository();

		await createClass(classInput, { classRepository });

		expect(classRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'GROUP' }),
		);
	});

	it('trims whitespace from name and description', async () => {
		const paddedInput = {
			name: '  Matematika Dasar  ',
			description: '  Kelas untuk siswa SD  ',
		};
		const classRepository = buildClassRepository();

		await createClass(paddedInput, { classRepository });

		expect(classRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Matematika Dasar',
				description: 'Kelas untuk siswa SD',
			}),
		);
	});

	it('omits description when it is blank', async () => {
		const blankDescriptionInput = {
			name: 'Matematika Dasar',
			description: '   ',
		};
		const classRepository = buildClassRepository();

		await createClass(blankDescriptionInput, { classRepository });

		expect(classRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ description: undefined }),
		);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Class name uniqueness — ClassRepository has no findByName() (or
//    equivalent) method, so no duplicate/uniqueness check is tested at
//    the application layer.
// 2. Whether the application use case performs any check beyond what the
//    domain `createClass` factory already validates (e.g. name length
//    limits, allowed characters) — not established by the domain
//    function shown, so not tested.
// 3. Error propagation style (custom error class vs. plain Error with a
//    message) — tests only assert on the thrown message, matching the
//    convention used in the existing createPayment use case tests.
