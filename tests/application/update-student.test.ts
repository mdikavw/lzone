/**
 * Unit tests for the updateStudent application use case.
 *
 * RED-first refactor: the CURRENT implementation still uses
 *   updateStudent(input: Student, dependencies): Promise<Student>
 * This file tests the NEW contract:
 *   updateStudent(id: string, input: UpdateStudentInput, dependencies): Promise<Student>
 * so it is expected to fail against the current implementation until the
 * use case itself is refactored to match.
 *
 * CONTRACT (new, consistent with updateClass):
 *   - `id` identifies the student to update (comes from the caller, e.g.
 *     an API route's URL param — not from `input`).
 *   - `input` contains ONLY the editable fields:
 *       { name: string; phone: string; email?: string; classId: string; status: StudentStatus }
 *     It does NOT include `id`, `createdAt`, `updatedAt`, or `billingType`
 *     — the type system prevents passing id/createdAt/updatedAt, so no
 *     runtime test is needed to prove those are rejected if included.
 *     `billingType` is part of Student but not part of this editable
 *     input, so it must be preserved from the existing record when the
 *     full entity is built (tested below as a structural necessity, not
 *     an invented rule).
 *   - Behavior:
 *     1. Fetch the existing student via studentRepository.findById(id).
 *        If not found, throw Error('Student not found').
 *     2. Fetch the target class via classRepository.findById(input.classId).
 *        If not found, throw Error('New class is not found').
 *        If found but status is 'INACTIVE', throw Error('New class is inactive').
 *     3. Build the full persisted Student by merging: id and createdAt
 *        (and billingType) preserved from the existing record;
 *        name/phone/email/classId/status taken from input; updatedAt set
 *        to a new timestamp.
 *     4. Call studentRepository.update() with that full Student and
 *        return its result.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborators (StudentRepository, ClassRepository), not how it calls
 *   them internally beyond the arguments/order that matter to callers.
 * - Both repositories are mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - No new business rules invented — name/phone/email format validation,
 *   uniqueness checks, and similar concerns are not established by this
 *   contract, so they are listed under "Ambiguities not covered by
 *   tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Student, StudentStatus } from '@/lib/domain/student';
import type { Class } from '@/lib/domain/class';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { updateStudent } from '@/lib/application/update-student';

// --- Test setup -------------------------------------------------------

type UpdateStudentInput = {
	name: string;
	phone: string;
	email?: string;
	classId: string;
	status: StudentStatus;
};

// Prior stored state, returned by studentRepository.findById(). Values
// deliberately differ from updateInput below so "preserved" vs. "taken
// from input" fields are distinguishable in assertions.
const existingStudent: Student = {
	id: 'student-123',
	name: 'Budi',
	phone: '081234567890',
	email: 'budi@example.com',
	status: 'INACTIVE',
	classId: 'class-111',
	billingType: 'PER_SESSION',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

// The target class the student is being moved into.
const targetClass: Class = {
	id: 'class-222',
	name: 'Kelas Baru',
	type: 'GROUP',
	description: 'Kelas baru untuk siswa',
	status: 'ACTIVE',
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
};

// Only the editable fields — no id, no createdAt/updatedAt/billingType.
const updateInput: UpdateStudentInput = {
	name: 'Budi Santoso',
	phone: '081298765432',
	email: 'budi.santoso@example.com',
	classId: 'class-222',
	status: 'ACTIVE',
};

// Builds a fresh StudentRepository mock. findById defaults to resolving
// the existing fixture; update() defaults to echoing back whatever it
// received.
function buildStudentRepository(
	overrides: Partial<StudentRepository> = {},
): StudentRepository {
	return {
		findById: vi.fn(async () => existingStudent),
		findAll: vi.fn(),
		findByClass: vi.fn(),
		create: vi.fn(),
		update: vi.fn(async (s) => s as Student),
		...overrides,
	};
}

// Builds a fresh ClassRepository mock. findById defaults to resolving an
// ACTIVE target class.
function buildClassRepository(
	overrides: Partial<ClassRepository> = {},
): ClassRepository {
	return {
		findById: vi.fn(async () => targetClass),
		findAll: vi.fn(),
		findActive: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('UpdateStudent — essential', () => {
	it('updates the student and persists the merged entity', async () => {
		const studentRepository = buildStudentRepository();
		const classRepository = buildClassRepository();

		await updateStudent('student-123', updateInput, {
			studentRepository,
			classRepository,
		});

		expect(studentRepository.findById).toHaveBeenCalledWith('student-123');
		expect(classRepository.findById).toHaveBeenCalledWith(
			updateInput.classId,
		);
		expect(studentRepository.update).toHaveBeenCalledTimes(1);

		const [persisted] = vi.mocked(studentRepository.update).mock.calls[0];

		// Preserved from the existing record.
		expect(persisted.id).toBe(existingStudent.id);
		expect(persisted.createdAt).toEqual(existingStudent.createdAt);
		expect(persisted.billingType).toBe(existingStudent.billingType);

		// Taken from the update input.
		expect(persisted.name).toBe(updateInput.name);
		expect(persisted.phone).toBe(updateInput.phone);
		expect(persisted.email).toBe(updateInput.email);
		expect(persisted.classId).toBe(updateInput.classId);
		expect(persisted.status).toBe(updateInput.status);

		// updatedAt is a new timestamp, not the preserved existing one.
		expect(persisted.updatedAt).toBeInstanceOf(Date);
		expect(persisted.updatedAt).not.toEqual(existingStudent.updatedAt);
	});

	it('returns the result of the repository update operation', async () => {
		const dbResult: Student = { ...existingStudent, name: 'From DB' };
		const studentRepository = buildStudentRepository({
			update: vi.fn(async () => dbResult),
		});
		const classRepository = buildClassRepository();

		const result = await updateStudent('student-123', updateInput, {
			studentRepository,
			classRepository,
		});

		expect(result).toBe(dbResult);
	});

	it('rejects when the student does not exist', async () => {
		const studentRepository = buildStudentRepository({
			findById: vi.fn(async () => null),
		});
		const classRepository = buildClassRepository();

		await expect(
			updateStudent('missing-id', updateInput, {
				studentRepository,
				classRepository,
			}),
		).rejects.toThrow('Student not found');
		expect(classRepository.findById).not.toHaveBeenCalled();
		expect(studentRepository.update).not.toHaveBeenCalled();
	});

	it('rejects when the new class does not exist', async () => {
		const studentRepository = buildStudentRepository();
		const classRepository = buildClassRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			updateStudent('student-123', updateInput, {
				studentRepository,
				classRepository,
			}),
		).rejects.toThrow('New class is not found');
		expect(classRepository.findById).toHaveBeenCalledWith(
			updateInput.classId,
		);
		expect(studentRepository.update).not.toHaveBeenCalled();
	});

	it('rejects when the new class is inactive', async () => {
		const inactiveClass: Class = { ...targetClass, status: 'INACTIVE' };
		const studentRepository = buildStudentRepository();
		const classRepository = buildClassRepository({
			findById: vi.fn(async () => inactiveClass),
		});

		await expect(
			updateStudent('student-123', updateInput, {
				studentRepository,
				classRepository,
			}),
		).rejects.toThrow('New class is inactive');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. name/phone/email format or uniqueness validation — not established
//    by this contract, so not tested.
// 2. Whether billingType can be changed through updateStudent — the
//    input type excludes it, so this suite treats it as preserved from
//    the existing record; there is no separate use case shown for
//    changing billing type.
// 3. Whether the class check is skipped when input.classId equals the
//    student's current classId — not established; the use case is
//    assumed to always look up the target class.
// 4. Authorization and repository/database error transformation — not
//    established by anything shown.
