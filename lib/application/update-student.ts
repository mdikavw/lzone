import { Student, StudentStatus } from '../domain/student';
import { ClassRepository } from '../repositories/class-repository';
import { StudentRepository } from '../repositories/student-repository';

interface UpdateStudentDependencies {
	studentRepository: StudentRepository;
	classRepository: ClassRepository;
}

interface UpdateStudentInput {
	name: string;
	phone: string;
	email?: string;
	classId: string;
	status: StudentStatus;
}

export async function updateStudent(
	id: string,
	input: UpdateStudentInput,
	dependencies: UpdateStudentDependencies,
): Promise<Student> {
	const { studentRepository, classRepository } = dependencies;
	const student = await studentRepository.findById(id);
	if (!student) throw new Error('Student not found');
	const classEntity = await classRepository.findById(input.classId);
	if (!classEntity) throw new Error('New class is not found');
	if (classEntity.status === 'INACTIVE')
		throw new Error('New class is inactive');
	return studentRepository.update({
		...student,
		...input,
		updatedAt: new Date(),
	});
}
