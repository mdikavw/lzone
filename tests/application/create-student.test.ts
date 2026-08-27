import { ClassRepository } from '../../lib/repositories/class-repository';
import { describe, expect, it, vi } from 'vitest';
import { StudentRepository } from '../../lib/repositories/student-repository';
import { createStudent } from '../../lib/application/create-student';

describe('CreateStudent', () => {
	it('creates a student when the class exists', async () => {
		const classEntity = {
			id: 'class-123',
			name: 'Matematika',
			type: 'GROUP' as const,
			status: 'ACTIVE' as const,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const studentRepository: StudentRepository = {
			findById: vi.fn(),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(async student => student),
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

		const result = await createStudent(
			{
				name: 'Budi',
				phone: '08123456789',
				classId: 'class-123',
			},
			{
				studentRepository,
				classRepository,
			},
		);

		expect(result.name).toBe('Budi');
		expect(result.classId).toBe('class-123');

		expect(classRepository.findById).toHaveBeenCalledWith('class-123');
		expect(studentRepository.create).toHaveBeenCalled();
	});

	it('rejects when the class does not exist', async () => {
		const studentRepository: StudentRepository = {
			findById: vi.fn(),
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
			createStudent(
				{
					name: 'Budi',
					phone: '08123456789',
					classId: 'class-does-not-exist',
				},
				{
					studentRepository,
					classRepository,
				},
			),
		).rejects.toThrow('Class not found');

		expect(studentRepository.create).not.toHaveBeenCalled();
	});

	it('rejects when the class is inactive', async () => {
		const classEntity = {
			id: 'class-123',
			name: 'Matematika',
			type: 'GROUP' as const,
			status: 'INACTIVE' as const,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const studentRepository: StudentRepository = {
			findById: vi.fn(),
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
			createStudent(
				{
					name: 'Budi',
					phone: '081234567890',
					classId: 'class-123',
				},
				{
					studentRepository,
					classRepository,
				},
			),
		).rejects.toThrow('Class is inactive');

		expect(studentRepository.create).not.toHaveBeenCalled();
	});
});
