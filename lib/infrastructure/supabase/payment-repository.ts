import { Database } from '@/lib/database.types';
import { Payment } from '@/lib/domain/payment';
import type { PaymentRepository } from '@/lib/repositories/payment-repository';
import { SupabaseClient } from '@supabase/supabase-js';

export class SupabasePaymentRepository implements PaymentRepository {
	constructor(private readonly supabase: SupabaseClient<Database>) {}

	async findById(id: string): Promise<Payment | null> {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return {
			id: data.id,
			studentId: data.student_id,
			amount: data.amount,
			paymentPeriod: new Date(data.payment_period),
			paidAt: new Date(data.paid_at),
			description: data.description ?? undefined,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async findByStudent(studentId: string): Promise<Payment[]> {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.eq('student_id', studentId);
		if (error) throw error;
		return data.map((p) => ({
			id: p.id,
			studentId: p.student_id,
			amount: p.amount,
			paymentPeriod: new Date(p.payment_period),
			paidAt: new Date(p.paid_at),
			description: p.description ?? undefined,
			createdAt: new Date(p.created_at),
			updatedAt: new Date(p.updated_at),
		}));
	}

	async findByStudentAndPeriod(
		studentId: string,
		period: Date,
	): Promise<Payment[]> {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.eq('student_id', studentId)
			.eq('payment_period', period.toISOString());
		if (error) throw error;
		return data.map((p) => ({
			id: p.id,
			studentId: p.student_id,
			amount: p.amount,
			paymentPeriod: new Date(p.payment_period),
			paidAt: new Date(p.paid_at),
			description: p.description ?? undefined,
			createdAt: new Date(p.created_at),
			updatedAt: new Date(p.updated_at),
		}));
	}

	async findByPeriod(period: Date): Promise<Payment[]> {
		const { data, error } = await this.supabase
			.from('payments')
			.select('*')
			.eq('payment_period', period.toISOString());
		if (error) throw error;
		return data.map((p) => ({
			id: p.id,
			studentId: p.student_id,
			amount: p.amount,
			paymentPeriod: new Date(p.payment_period),
			paidAt: new Date(p.paid_at),
			description: p.description ?? undefined,
			createdAt: new Date(p.created_at),
			updatedAt: new Date(p.updated_at),
		}));
	}

	async create(payment: Payment): Promise<Payment> {
		const payload = {
			id: payment.id,
			student_id: payment.studentId,
			amount: payment.amount,
			payment_period: payment.paymentPeriod.toISOString(),
			paid_at: payment.paidAt.toISOString(),
			description: payment.description ?? null,
			created_at: payment.createdAt.toISOString(),
			updated_at: payment.updatedAt.toISOString(),
		};
		const { data, error } = await this.supabase
			.from('payments')
			.insert(payload)
			.select()
			.single();

		if (error) throw error;
		return {
			id: data.id,
			studentId: data.student_id,
			amount: data.amount,
			paymentPeriod: new Date(data.payment_period),
			paidAt: new Date(data.paid_at),
			description: data.description ?? undefined,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}

	async update(payment: Payment): Promise<Payment> {
		const payload = {
			id: payment.id,
			student_id: payment.studentId,
			amount: payment.amount,
			payment_period: payment.paymentPeriod.toISOString(),
			paid_at: payment.paidAt.toISOString(),
			description: payment.description ?? null,
			created_at: payment.createdAt.toISOString(),
			updated_at: payment.updatedAt.toISOString(),
		};
		const { data, error } = await this.supabase
			.from('payments')
			.update(payload)
			.eq('id', payment.id)
			.select()
			.single();

		if (error) throw error;
		return {
			id: data.id,
			studentId: data.student_id,
			amount: data.amount,
			paymentPeriod: new Date(data.payment_period),
			paidAt: new Date(data.paid_at),
			description: data.description ?? undefined,
			createdAt: new Date(data.created_at),
			updatedAt: new Date(data.updated_at),
		};
	}
}
