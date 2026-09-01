/**
 * Unit tests for the getStudent application use case.
 *
 * RED-first TDD: `@/lib/application/get-student` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (StudentRepository), not how it calls it internally.
 * - StudentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - getStudent is a read-only lookup: fetch by id, throw "Student not
 *   found" when absent, otherwise return the repository's result as-is.
 *   No write operation should ever be invoked.
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { getStudent } from '@/lib/application/get-student';

// --- Test setup -------------------------------------------------------

const existingStudent: Student = {
	id: 'student-123',
	name: 'Budi',
	phone: '081234567890',
	status: 'ACTIVE',
	classId: 'class-123',
	billingType: 'MONTHLY',
	createdAt: new Date('2026-01-10'),
	updatedAt: new Date('2026-01-10'),
};

// Builds a fresh StudentRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildStudentRepository(
	overrides: Partial<StudentRepository> = {},
): StudentRepository {
	return {
		findById: vi.fn(async () => existingStudent),
		findAll: vi.fn(),
		findByClass: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetStudent — essential', () => {
	it('returns the student when it exists', async () => {
		const studentRepository = buildStudentRepository();

		const result = await getStudent('student-123', { studentRepository });

		expect(result).toBe(existingStudent);
		expect(studentRepository.findById).toHaveBeenCalledWith('student-123');
		expect(studentRepository.create).not.toHaveBeenCalled();
		expect(studentRepository.update).not.toHaveBeenCalled();
	});

	it('rejects when the student does not exist', async () => {
		const studentRepository = buildStudentRepository({
			findById: vi.fn(async () => null),
		});

		await expect(
			getStudent('student-123', { studentRepository }),
		).rejects.toThrow('Student not found');
		expect(studentRepository.create).not.toHaveBeenCalled();
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Whether the id argument is validated (e.g. format, empty string)
//    before being passed to findById — nothing in the repository/domain
//    establishes this, so no such validation is tested.
// 2. Authorization (e.g. whether the caller may view this particular
//    student) — not established by anything shown.
