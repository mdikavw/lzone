import { Class } from '../domain/class';
import { ClassRepository } from '../repositories/class-repository';

interface GetClassesDependency {
	classRepository: ClassRepository;
}

export async function getClasses(
	dependency: GetClassesDependency,
): Promise<Class[]> {
	const { classRepository } = dependency;
	return await classRepository.findAll();
}
