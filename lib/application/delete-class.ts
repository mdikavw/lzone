import { ClassRepository } from '../repositories/class-repository';

interface DeleteClassDependency {
	classRepository: ClassRepository;
}

export async function deleteClass(
	id: string,
	dependency: DeleteClassDependency,
): Promise<void> {
	const { classRepository } = dependency;
	const classEntity = await classRepository.findById(id);
	if (!classEntity) throw new Error('Class not found');
	await classRepository.delete(id);
}
