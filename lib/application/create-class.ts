import { ClassType } from '../domain/class';
import { ClassRepository } from '../repositories/class-repository';
import { createClass as createClassDomain } from '../domain/class';

interface CreateClassInput {
	name: string;
	type: ClassType;
	description?: string | undefined;
}

interface CreateClassDependencies {
	classRepository: ClassRepository;
}

export async function createClass(
	input: CreateClassInput,
	dependency: CreateClassDependencies,
) {
	const { classRepository } = dependency;
	const classEntity = createClassDomain(input);
	return classRepository.create(classEntity);
}
