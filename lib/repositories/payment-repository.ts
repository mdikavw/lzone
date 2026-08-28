import { Payment } from '@/lib/domain/payment';

export interface PaymentRepository {
	findById(id: string): Promise<Payment | null>;

	findByStudent(studentId: string): Promise<Payment[]>;

	findByStudentAndPeriod(studentId: string, period: Date): Promise<Payment[]>;

	findByPeriod(period: Date): Promise<Payment[]>;

	create(payment: Payment): Promise<Payment>;

	update(payment: Payment): Promise<Payment>;
}
