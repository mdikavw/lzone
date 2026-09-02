import { Payment } from '../domain/payment';
import { PaymentRepository } from './../repositories/payment-repository';

interface GetPaymentsByStudentAndPeriodInput {
	studentId: string;
	paymentPeriod: Date;
}

interface GetPaymentsByStudentAndPeriodDependency {
	paymentRepository: PaymentRepository;
}

export async function getPaymentsByStudentAndPeriod(
	input: GetPaymentsByStudentAndPeriodInput,
	dependency: GetPaymentsByStudentAndPeriodDependency,
): Promise<Payment[]> {
	const { paymentRepository } = dependency;
	return await paymentRepository.findByStudentAndPeriod(
		input.studentId,
		input.paymentPeriod,
	);
}
