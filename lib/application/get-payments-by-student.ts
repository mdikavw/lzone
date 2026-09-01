import { Payment } from '../domain/payment';
import { PaymentRepository } from '../repositories/payment-repository';

interface GetPaymentsByStudentDependency {
	paymentRepository: PaymentRepository;
}

export async function getPaymentsByStudent(
	studentId: string,
	dependency: GetPaymentsByStudentDependency,
): Promise<Payment[]> {
	const { paymentRepository } = dependency;
	return await paymentRepository.findByStudent(studentId);
}
