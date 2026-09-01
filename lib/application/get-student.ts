import { Student } from '../domain/student';
import { StudentRepository } from '../repositories/student-repository';

interface GetStudentDependency {
	studentRepository: StudentRepository;
}

export async function getStudent(
	id: string,
	dependency: GetStudentDependency,
): Promise<Student> {
	const { studentRepository } = dependency;
	const student = await studentRepository.findById(id);
	if (!student) throw new Error('Student not found');
	return student;
}
