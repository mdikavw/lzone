import { Class } from '../domain/class';
import { ClassRepository } from '../repositories/class-repository';

interface UpdateClassDependencies {
	classRepository: ClassRepository;
}

export async function updateClass(
	input: Class,
	dependency: UpdateClassDependencies,
): Promise<Class> {
	const { classRepository } = dependency;
	const classEntity = await classRepository.findById(input.id);
	if (!classEntity) throw new Error('Class not found');
	return classRepository.update(input);
}
