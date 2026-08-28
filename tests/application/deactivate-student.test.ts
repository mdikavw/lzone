import { deactivateStudent } from '@/lib/application/deactivate-student';
import { Student, StudentStatus } from '@/lib/domain/student';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { describe, expect, it, vi } from 'vitest';

const student: Student = {
	id: 'student-123',
	name: 'Budi',
	phone: '081234567890',
	status: 'ACTIVE',
	classId: 'class-123',
	billingType: 'MONTHLY',
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe('DeactivateStudent', () => {
	it('deactivates an existing student', async () => {
		const newStudent = {
			...student,
			status: 'INACTIVE' as StudentStatus,
		};
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(async () => newStudent),
		};
		const result = await deactivateStudent(
			{ ...newStudent },

			studentRepository,
		);
		expect(result.status).toBe('INACTIVE');
		expect(result.status).not.toEqual(student.status);
		expect(studentRepository.update).toHaveBeenCalledWith(newStudent);
	});
	it('rejects when student does not exist', async () => {
		const newStudent = {
			...student,
			status: 'INACTIVE' as StudentStatus,
		};
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => null),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};
		await expect(
			deactivateStudent(
				{
					...newStudent,
				},
				studentRepository,
			),
		).rejects.toThrow('Student not found');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
	it('rejects when student is already inactive', async () => {
		const inactiveStudent = {
			...student,
			status: 'INACTIVE' as StudentStatus,
		};
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => inactiveStudent),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		await expect(
			deactivateStudent(
				{
					...inactiveStudent,
				},
				studentRepository,
			),
		).rejects.toThrow('Student is already inactive');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
});
