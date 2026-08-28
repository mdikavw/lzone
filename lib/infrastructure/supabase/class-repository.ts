import { Database } from '@/lib/database.types';
import { Class } from '@/lib/domain/class';
import { ClassRepository } from '@/lib/repositories/class-repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseClassRepository implements ClassRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async findById(id: string): Promise<Class | null> {
		const { data, error } = await this.supabase
			.from('classes')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return {
			id: data.id,
			name: data.name,
			type: data.type,
			description: data.description ?? undefined,
			status: data.status,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async findAll(): Promise<Class[]> {
		const { data, error } = await this.supabase.from('classes').select('*');
		if (error) throw error;
		return data.map((s) => ({
			id: s.id,
			name: s.name,
			type: s.type,
			description: s.description ?? undefined,
			status: s.status,
			createdAt: new Date(s.created_at),
			updatedAt: new Date(s.updated_at),
		}));
	}

	async findActive(): Promise<Class[]> {
		const { data, error } = await this.supabase
			.from('classes')
			.select('*')
			.eq('status', 'ACTIVE');
		if (error) throw error;
		return data.map((s) => ({
			id: s.id,
			name: s.name,
			type: s.type,
			description: s.description ?? undefined,
			status: s.status,
			createdAt: new Date(s.created_at),
			updatedAt: new Date(s.updated_at),
		}));
	}

	async create(classEntity: Class): Promise<Class> {
		const payload = {
			id: classEntity.id,
			name: classEntity.name,
			type: classEntity.type,
			description: classEntity.description ?? null,
			status: classEntity.status,
			created_at: classEntity.createdAt.toISOString(),
			updated_at: classEntity.updatedAt.toISOString(),
		};
		const { data, error } = await this.supabase
			.from('classes')
			.insert(payload)
			.select()
			.single();
		if (error) throw error;
		return {
			id: data.id,
			name: data.name,
			type: data.type,
			description: data.description ?? undefined,
			status: data.status,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async update(classEntity: Class): Promise<Class> {
		const payload = {
			id: classEntity.id,
			name: classEntity.name,
			type: classEntity.type,
			description: classEntity.description ?? null,
			status: classEntity.status,
			created_at: classEntity.createdAt.toISOString(),
			updated_at: classEntity.updatedAt.toISOString(),
		};
		const { data, error } = await this.supabase
			.from('classes')
			.update(payload)
			.eq('id', classEntity.id)
			.select()
			.single();
		if (error) throw error;
		return {
			id: data.id,
			name: data.name,
			type: data.type,
			description: data.description ?? undefined,
			status: data.status,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async delete(id: string): Promise<void> {
		const { error } = await this.supabase
			.from('classes')
			.delete()
			.eq('id', id);

		if (error) throw error;
	}
}
