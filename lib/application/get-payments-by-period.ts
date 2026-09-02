import { PaymentRepository } from '../repositories/payment-repository';
import { Payment } from '../domain/payment';

interface GetPaymentsByPeriodDependency {
	paymentRepository: PaymentRepository;
}

export async function getPaymentsByPeriod(
	period: Date,
	dependency: GetPaymentsByPeriodDependency,
): Promise<Payment[]> {
	const { paymentRepository } = dependency;
	return await paymentRepository.findByPeriod(period);
}
