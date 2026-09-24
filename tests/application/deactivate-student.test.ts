/**
 * Unit tests for the deactivateStudent application use case.
 *
 * RED-first refactor: this file tests the NEW contract:
 *   deactivateStudent(id: string, dependencies: { studentRepository: StudentRepository }): Promise<Student>
 * consistent with the ID + dependencies pattern already established for
 * updateStudent. The current production implementation is expected to
 * use a different signature, so this file is expected to fail until
 * deactivateStudent itself is refactored to match.
 *
 * Behavior:
 *   1. Fetch the student via studentRepository.findById(id).
 *      If not found, throw Error('Student not found').
 *   2. If the student's status is already 'INACTIVE', throw
 *      Error('Student is already inactive').
 *   3. Otherwise, build the updated Student by preserving every existing
 *      field and changing only `status` to 'INACTIVE' — including
 *      `updatedAt`, which is NOT regenerated (this contract does not
 *      establish a new timestamp on deactivation, unlike updateStudent).
 *   4. Call studentRepository.update() with that entity and return its
 *      result.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (StudentRepository), not how it calls it internally.
 * - StudentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - No HTTP/API behavior, validation formatting, authorization, or
 *   repository/database behavior is tested here.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { deactivateStudent } from '@/lib/application/deactivate-student';

// --- Test setup -------------------------------------------------------

const existingActiveStudent: Student = {
	id: 'student-123',
	name: 'Budi',
	phone: '081234567890',
	email: 'budi@example.com',
	status: 'ACTIVE',
	classId: 'class-111',
	billingType: 'MONTHLY',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

// Builds a fresh StudentRepository mock. findById defaults to resolving
// the existing active fixture; update() defaults to echoing back
// whatever it received.
function buildStudentRepository(
	overrides: Partial<StudentRepository> = {},
): StudentRepository {
	return {
		findById: vi.fn(async () => existingActiveStudent),
		findAll: vi.fn(),
		findByClass: vi.fn(),
		create: vi.fn(),
		update: vi.fn(async (s) => s as Student),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('DeactivateStudent — essential', () => {
	it('deactivates an active student', async () => {
		const dbResult: Student = {
			...existingActiveStudent,
			status: 'INACTIVE',
			id: 'from-db',
		};
		const studentRepository = buildStudentRepository({
			update: vi.fn(async () => dbResult),
		});

		const result = await deactivateStudent('student-123', {
			studentRepository,
		});

		expect(studentRepository.findById).toHaveBeenCalledWith('student-123');
		expect(studentRepository.update).toHaveBeenCalledTimes(1);

		const [persisted] = vi.mocked(studentRepository.update).mock.calls[0];
		// All existing fields preserved; only status changes.
		expect(persisted).toEqual({
			...existingActiveStudent,
			status: 'INACTIVE',
		});

		// The returned value is the result of studentRepository.update(),
		// not something the use case constructs itself.
		expect(result).toBe(dbResult);
	});

	it('rejects when the student does not exist', async () => {
		const studentRepository = buildStudentRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			deactivateStudent('missing-id', { studentRepository }),
		).rejects.toThrow('Student not found');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});

	it('rejects when the student is already inactive', async () => {
		const inactiveStudent: Student = {
			...existingActiveStudent,
			status: 'INACTIVE',
		};
		const studentRepository = buildStudentRepository({
			findById: vi.fn(async () => inactiveStudent),
		});

		await expect(
			deactivateStudent('student-123', { studentRepository }),
		).rejects.toThrow('Student is already inactive');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
});
