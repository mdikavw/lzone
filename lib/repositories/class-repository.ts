import { Class } from '@/lib/domain/class';

export interface ClassRepository {
	findById(id: string): Promise<Class | null>;

	findAll(): Promise<Class[]>;

	findActive(): Promise<Class[]>;

	create(classEntity: Class): Promise<Class>;

	update(classEntity: Class): Promise<Class>;

	delete(id: string): Promise<void>;
}
