import { Student } from '../domain/student';
import { ClassRepository } from '../repositories/class-repository';
import { StudentRepository } from '../repositories/student-repository';

interface UpdateStudentDependencies {
	studentRepository: StudentRepository;
	classRepository: ClassRepository;
}

export async function updateStudent(
	input: Student,
	dependencies: UpdateStudentDependencies,
): Promise<Student> {
	const { studentRepository, classRepository } = dependencies;
	const student = await studentRepository.findById(input.id);
	if (!student) throw new Error('Student not found');
	const classEntity = await classRepository.findById(input.classId);
	if (!classEntity) throw new Error('New class is not found');
	if (classEntity.status === 'INACTIVE')
		throw new Error('New class is inactive');
	return studentRepository.update(input);
}
