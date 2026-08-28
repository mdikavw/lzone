import { Database } from '@/lib/database.types';
import { Student } from '@/lib/domain/student';
import type { StudentRepository } from '@/lib/repositories/student-repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseStudentRepository implements StudentRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async findById(id: string): Promise<Student | null> {
		const { data, error } = await this.supabase
			.from('students')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return {
			id: data.id,
			name: data.name,
			phone: data.phone,
			email: data.email ?? undefined,
			status: data.status,
			classId: data.class_id,
			billingType: data.billing_type,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async findAll(): Promise<Student[]> {
		const { data, error } = await this.supabase
			.from('students')
			.select('*');
		if (error) throw error;
		return data.map(s => ({
			id: s.id,
			name: s.name,
			phone: s.phone,
			email: s.email ?? undefined,
			status: s.status,
			classId: s.class_id,
			billingType: s.billing_type,
			createdAt: new Date(s.created_at),
			updatedAt: new Date(s.updated_at),
		}));
	}

	async findByClass(classId: string): Promise<Student[]> {
		const { data, error } = await this.supabase
			.from('students')
			.select('*')
			.eq('class_id', classId);
		if (error) throw error;
		return data.map(s => ({
			id: s.id,
			name: s.name,
			phone: s.phone,
			email: s.email ?? undefined,
			status: s.status,
			classId: s.class_id,
			billingType: s.billing_type,
			createdAt: new Date(s.created_at),
			updatedAt: new Date(s.updated_at),
		}));
	}

	async create(student: Student): Promise<Student> {
		const payload = {
			id: student.id,
			name: student.name,
			phone: student.phone,
			email: student.email ?? null,
			status: student.status,
			class_id: student.classId,
			billing_type: student.billingType,
			created_at: student.createdAt.toISOString(),
			updated_at: student.updatedAt.toISOString(),
		};
		const { data, error } = await this.supabase
			.from('students')
			.insert(payload)
			.select()
			.single();
		if (error) throw error;
		return {
			id: data.id,
			name: data.name,
			phone: data.phone,
			email: data.email ?? undefined,
			status: data.status,
			classId: data.class_id,
			billingType: data.billing_type,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async update(student: Student): Promise<Student> {
		const payload = {
			name: student.name,
			phone: student.phone,
			email: student.email ?? null,
			status: student.status,
			class_id: student.classId,
			billing_type: student.billingType,
			created_at: student.createdAt.toISOString(),
			updated_at: student.updatedAt.toISOString(),
		};
		const { data, error } = await this.supabase
			.from('students')
			.update(payload)
			.eq('id', student.id)
			.select()
			.single();
		if (error) throw error;
		return {
			id: data.id,
			name: data.name,
			phone: data.phone,
			email: data.email ?? undefined,
			status: data.status,
			classId: data.class_id,
			billingType: data.billing_type,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}
}
