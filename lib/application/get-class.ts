import { Class } from '../domain/class';
import { ClassRepository } from '../repositories/class-repository';

interface GetClassDependency {
	classRepository: ClassRepository;
}

export async function getClass(
	id: string,
	dependency: GetClassDependency,
): Promise<Class> {
	const { classRepository } = dependency;
	const classEntity = await classRepository.findById(id);
	if (!classEntity) throw new Error('Class not found');
	return classEntity;
}
