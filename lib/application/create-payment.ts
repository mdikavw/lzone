import { Payment } from '../domain/payment';
import { PaymentRepository } from '../repositories/payment-repository';
import { StudentRepository } from '../repositories/student-repository';
import { createPayment as createPaymentDomain } from '../domain/payment';

interface CreatePaymentInput {
	studentId: string;
	amount: number;
	paymentPeriod: Date;
	paidAt: Date;
	description?: string;
}

interface CreatePaymentDependencies {
	paymentRepository: PaymentRepository;
	studentRepository: StudentRepository;
}

export async function createPayment(
	input: CreatePaymentInput,
	dependencies: CreatePaymentDependencies,
): Promise<Payment> {
	const { paymentRepository, studentRepository } = dependencies;

	if (input.amount <= 0) throw new Error('Payment amount is invalid');

	const student = await studentRepository.findById(input.studentId);
	if (!student) throw new Error('Student not found');

	const period = new Date(input.paymentPeriod);
	period.setDate(1);
	const studentPaymentThisPeriod =
		await paymentRepository.findByStudentAndPeriod(student.id, period);
	if (studentPaymentThisPeriod.length > 0)
		throw new Error('Payment already exists');
	const payment = createPaymentDomain(input);
	return paymentRepository.create(payment);
}
