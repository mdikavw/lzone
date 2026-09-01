import { Student } from '../domain/student';
import { StudentRepository } from '../repositories/student-repository';

interface GetStudentsDependency {
	studentRepository: StudentRepository;
}

export async function getStudents(
	dependency: GetStudentsDependency,
): Promise<Student[]> {
	const { studentRepository } = dependency;
	return await studentRepository.findAll();
}
