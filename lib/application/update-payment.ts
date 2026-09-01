import { Payment } from '../domain/payment';
import { PaymentRepository } from '../repositories/payment-repository';

interface UpdatePaymentDependency {
	paymentRepository: PaymentRepository;
}

export async function updatePayment(
	input: Payment,
	dependency: UpdatePaymentDependency,
): Promise<Payment> {
	const { paymentRepository } = dependency;

	const payment = await paymentRepository.findById(input.id);
	if (!payment) throw new Error('Payment not found');

	const paymentInTargetPeriod =
		await paymentRepository.findByStudentAndPeriod(
			input.studentId,
			input.paymentPeriod,
		);
	if (paymentInTargetPeriod.some((payment) => payment.id !== input.id))
		throw new Error('Payment already exists');

	return await paymentRepository.update(input);
}
