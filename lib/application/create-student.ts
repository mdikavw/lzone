import {
	createStudent as createStudentDomain,
	Student,
} from '../domain/student';
import { ClassRepository } from '../repositories/class-repository';
import { StudentRepository } from '../repositories/student-repository';

interface CreateStudentInput {
	name: string;
	phone: string;
	classId: string;
	email?: string;
}

interface CreateStudentDependencies {
	studentRepository: StudentRepository;
	classRepository: ClassRepository;
}

export async function createStudent(
	input: CreateStudentInput,
	dependencies: CreateStudentDependencies,
): Promise<Student> {
	const { studentRepository, classRepository } = dependencies;
	const classEntity = await classRepository.findById(input.classId);

	if (!classEntity) throw new Error('Class not found');
	if (classEntity.status === 'INACTIVE') throw new Error('Class is inactive');

	const student = createStudentDomain(input);
	return studentRepository.create(student);
}
