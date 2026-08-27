import { Payment } from '@/lib/domain/payment';

export interface PaymentRepository {
	findById(id: string): Promise<Payment | null>;

	findByStudent(studentId: string): Promise<Payment | null>;

	findByStudentAndPeriod(
		studentId: string,
		period: Date,
	): Promise<Payment | null>;

	findByPeriod(period: Date): Promise<Payment | null>;

	create(payment: Payment): Promise<Payment>;

	update(payment: Payment): Promise<Payment>;
}
