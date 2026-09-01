/**
 * Unit tests for the getStudents application use case.
 *
 * RED-first TDD: `@/lib/application/get-students` does not exist yet.
 * This file is expected to fail (module not found / test collection
 * failure) until the use case is implemented.
 *
 * Scope:
 * - Behavior-focused: verifies what the use case does with its
 *   collaborator (StudentRepository), not how it calls it internally.
 * - StudentRepository is mocked — this is an application-layer unit
 *   test, not a Supabase integration test.
 * - getStudents is a read-only listing: return whatever findAll()
 *   resolves to, unchanged. No filtering, ordering, or status rule is
 *   assumed. No write operation should ever be invoked.
 * - No new business rules invented — anything not established by the
 *   repository/domain contract is listed under "Ambiguities not covered
 *   by tests" instead of being tested.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Student } from '@/lib/domain/student';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { getStudents } from '@/lib/application/get-students';

// --- Test setup -------------------------------------------------------

const students: Student[] = [
	{
		id: 'student-123',
		name: 'Budi',
		phone: '081234567890',
		status: 'ACTIVE',
		classId: 'class-123',
		billingType: 'MONTHLY',
		createdAt: new Date('2026-01-10'),
		updatedAt: new Date('2026-01-10'),
	},
	{
		id: 'student-456',
		name: 'Siti',
		phone: '081234567891',
		status: 'INACTIVE',
		classId: 'class-456',
		billingType: 'PER_SESSION',
		createdAt: new Date('2026-01-11'),
		updatedAt: new Date('2026-01-11'),
	},
];

// Builds a fresh StudentRepository mock so individual tests only need to
// override the method(s) relevant to that test.
function buildStudentRepository(
	overrides: Partial<StudentRepository> = {},
): StudentRepository {
	return {
		findById: vi.fn(),
		findAll: vi.fn(async () => students),
		findByClass: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		...overrides,
	};
}

// --- Essential tests ----------------------------------------------------

describe('GetStudents — essential', () => {
	it('returns all students', async () => {
		const studentRepository = buildStudentRepository();

		const result = await getStudents({ studentRepository });

		expect(result).toBe(students);
		expect(studentRepository.findAll).toHaveBeenCalled();
		expect(studentRepository.create).not.toHaveBeenCalled();
		expect(studentRepository.update).not.toHaveBeenCalled();
	});

	it('returns an empty array when there are no students', async () => {
		const studentRepository = buildStudentRepository({
			findAll: vi.fn(async () => []),
		});

		const result = await getStudents({ studentRepository });

		expect(result).toEqual([]);
		expect(studentRepository.create).not.toHaveBeenCalled();
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. Filtering by status (e.g. only ACTIVE students) — not established
//    for getStudents; findByClass exists on the repository for scoping
//    by class, but nothing establishes a status filter here, so the mix
//    of ACTIVE/INACTIVE students in the fixture above is returned as-is.
// 2. Ordering of the returned list — not established, so no assertion is
//    made on result order beyond identity with the repository's return
//    value.
// 3. Authorization (e.g. whether the caller may list all students) — not
//    established by anything shown.
