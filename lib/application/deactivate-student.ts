import { Student } from '../domain/student';
import { StudentRepository } from '../repositories/student-repository';

export async function deactivateStudent(
	input: Student,
	studentRepository: StudentRepository,
): Promise<Student> {
	const student = await studentRepository.findById(input.id);
	if (!student) throw new Error('Student not found');
	if (student.status === 'INACTIVE')
		throw new Error('Student is already inactive');
	return studentRepository.update({
		...student,
		status: 'INACTIVE',
	});
}
