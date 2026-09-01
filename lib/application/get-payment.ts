import { Payment } from '../domain/payment';
import { PaymentRepository } from '../repositories/payment-repository';

interface GetPaymentDependency {
	paymentRepository: PaymentRepository;
}

export async function getPayment(
	id: string,
	dependency: GetPaymentDependency,
): Promise<Payment> {
	const { paymentRepository } = dependency;
	const payment = await paymentRepository.findById(id);
	if (!payment) throw new Error('Payment not found');
	return payment;
}
