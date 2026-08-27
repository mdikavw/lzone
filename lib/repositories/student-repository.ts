import { Student } from '@/lib/domain/student';

export interface StudentRepository {
	findById(id: string): Promise<Student | null>;

	findAll(): Promise<Student[]>;

	findByClass(classId: string): Promise<Student[]>;

	create(student: Student): Promise<Student>;

	update(student: Student): Promise<Student>;
}
