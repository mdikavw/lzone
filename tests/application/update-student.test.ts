import { Student } from '@/lib/domain/student';
import { describe, expect, it, vi } from 'vitest';
import { updateStudent } from '@/lib/application/update-student';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { Class } from '@/lib/domain/class';

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
const classEntity = {
	id: 'class-123',
	name: 'Matematika',
	type: 'GROUP' as const,
	status: 'ACTIVE' as const,
	createdAt: new Date(),
	updatedAt: new Date(),
};

describe('UpdateStudent', () => {
	it('updates student with valid data', async () => {
		const newStudent = { ...student, phone: '081122334455' };

		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(async () => newStudent),
		};
		const classRepository: ClassRepository = {
			findById: vi.fn(async () => classEntity),
			findAll: vi.fn(),
			findActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		const result = await updateStudent(
			{
				...newStudent,
			},
			{ studentRepository, classRepository },
		);
		expect(result.phone).toBe(newStudent.phone);
		expect(result.phone).not.toBe(student.phone);
		expect(studentRepository.update).toHaveBeenCalledWith(newStudent);
	});
	it('rejects when student is not exist', async () => {
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => null),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};
		const classRepository: ClassRepository = {
			findById: vi.fn(async () => classEntity),
			findAll: vi.fn(),
			findActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};

		await expect(
			updateStudent(
				{
					...student,
				},
				{
					studentRepository,
					classRepository,
				},
			),
		).rejects.toThrow('Student not found');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
	it('changes student classId to a new classId', async () => {
		const newStudent = { ...student, classId: 'class-456' };
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(async () => newStudent),
		};
		const classRepository: ClassRepository = {
			findById: vi.fn(async () => classEntity),
			findAll: vi.fn(),
			findActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		const result = await updateStudent(
			{ ...newStudent },
			{ studentRepository, classRepository },
		);

		expect(result.classId).toBe(newStudent.classId);
		expect(result.classId).not.toBe(student.classId);
		expect(studentRepository.update).toHaveBeenCalledWith(newStudent);
	});
	it('rejects when new class is not found', async () => {
		const newStudent = {
			...student,
			classId: 'class-456',
		};
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};
		const classRepository: ClassRepository = {
			findById: vi.fn(async () => null),
			findAll: vi.fn(),
			findActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};
		await expect(
			updateStudent(
				{ ...newStudent },
				{ studentRepository, classRepository },
			),
		).rejects.toThrow('New class is not found');
		expect(classRepository.findById).toHaveBeenCalledWith(
			newStudent.classId,
		);
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
	it('rejects when new class is inactive', async () => {
		const newStudent = {
			...student,
			classId: 'class-456',
		};
		const newClassEntity: Class = { ...classEntity, status: 'INACTIVE' };
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};
		const classRepository: ClassRepository = {
			findById: vi.fn(async () => newClassEntity),
			findAll: vi.fn(),
			findActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		};

		await expect(
			updateStudent(
				{ ...newStudent },
				{ studentRepository, classRepository },
			),
		).rejects.toThrow('New class is inactive');
		expect(studentRepository.update).not.toHaveBeenCalled();
	});
});
