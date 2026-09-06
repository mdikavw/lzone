import { Class, ClassStatus, ClassType } from '../domain/class';
import { ClassRepository } from '../repositories/class-repository';

interface UpdateClassInput {
	name: string;
	type: ClassType;
	description?: string;
	status: ClassStatus;
}

interface UpdateClassDependencies {
	classRepository: ClassRepository;
}

export async function updateClass(
	id: string,
	input: UpdateClassInput,
	dependency: UpdateClassDependencies,
): Promise<Class> {
	const { classRepository } = dependency;
	const classEntity = await classRepository.findById(id);
	if (!classEntity) throw new Error('Class not found');
	return classRepository.update({
		...classEntity,
		name: input.name,
		type: input.type,
		description: input.description,
		status: input.status,
		updatedAt: new Date(),
	});
}
