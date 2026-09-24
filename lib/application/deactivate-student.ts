import { Student } from '../domain/student';
import { StudentRepository } from '../repositories/student-repository';

interface DeactivateStudentDependency {
	studentRepository: StudentRepository;
}

export async function deactivateStudent(
	id: string,
	dependency: DeactivateStudentDependency,
): Promise<Student> {
	const { studentRepository } = dependency;
	const student = await studentRepository.findById(id);
	if (!student) throw new Error('Student not found');
	if (student.status === 'INACTIVE')
		throw new Error('Student is already inactive');
	return studentRepository.update({
		...student,
		status: 'INACTIVE',
	});
}
