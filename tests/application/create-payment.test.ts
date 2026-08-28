import { Student } from '@/lib/domain/student';
import { StudentRepository } from '@/lib/repositories/student-repository';
import { describe, expect, it, vi } from 'vitest';
import { createPayment } from '@/lib/application/create-payment';
import { PaymentRepository } from '@/lib/repositories/payment-repository';

const student: Student = {
	id: 'student-123',
	name: 'Budi',
	phone: '081234567890',
	status: 'ACTIVE',
	classId: 'class-123',
	billingType: 'MONTHLY',
	createdAt: new Date(),
	updatedAt: new Date(),
};
const payment = {
	studentId: 'student-123',
	amount: 100000,
	paymentPeriod: new Date(),
	paidAt: new Date(),
	description: undefined,
};
describe('CreatePayment', () => {
	it('creates a monthly payment with valid data', async () => {
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		const paymentRepository: PaymentRepository = {
			findById: vi.fn(),
			findByStudent: vi.fn(),
			findByStudentAndPeriod: vi.fn(),
			findByPeriod: vi.fn(),
			create: vi.fn(async payment => payment),
			update: vi.fn(),
		};

		const result = await createPayment(payment, {
			paymentRepository,
			studentRepository,
		});
		const normalizedPaymentPeriod = new Date(payment.paidAt);
		normalizedPaymentPeriod.setDate(1);
		expect(result.studentId).toBe('student-123');
		expect(studentRepository.findById).toHaveBeenCalledWith(student.id);
		expect(paymentRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				studentId: payment.studentId,
				amount: payment.amount,
				paymentPeriod: normalizedPaymentPeriod,
			}),
		);
	});
	it('rejects when student is not found', async () => {
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => null),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		const paymentRepository: PaymentRepository = {
			findById: vi.fn(),
			findByStudent: vi.fn(),
			findByStudentAndPeriod: vi.fn(),
			findByPeriod: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};
		await expect(
			createPayment(payment, { paymentRepository, studentRepository }),
		).rejects.toThrow('Student not found');
		expect(paymentRepository.create).not.toHaveBeenCalled();
	});
	it('rejects when payment amount is invalid', async () => {
		const invalidPayment = { ...payment, amount: -100000 };
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		const paymentRepository: PaymentRepository = {
			findById: vi.fn(),
			findByStudent: vi.fn(),
			findByStudentAndPeriod: vi.fn(),
			findByPeriod: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};
		await expect(
			createPayment(invalidPayment, {
				paymentRepository,
				studentRepository,
			}),
		).rejects.toThrow('Payment amount is invalid');
		expect(paymentRepository.create).not.toHaveBeenCalled();
	});
	it('rejects when student already has a payment for the period', async () => {
		const duplicatePayment = {
			...payment,
			id: 'payment-456',
			updatedAt: new Date(),
			createdAt: new Date(),
		};
		const studentRepository: StudentRepository = {
			findById: vi.fn(async () => student),
			findAll: vi.fn(),
			findByClass: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		const paymentRepository: PaymentRepository = {
			findById: vi.fn(),
			findByStudent: vi.fn(),
			findByStudentAndPeriod: vi.fn(async () => duplicatePayment),
			findByPeriod: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		};

		const normalizedPaymentPeriod = new Date(payment.paidAt);
		normalizedPaymentPeriod.setDate(1);

		await expect(
			createPayment(payment, {
				paymentRepository,
				studentRepository,
			}),
		).rejects.toThrow('Payment already exists');
		expect(paymentRepository.findByStudentAndPeriod).toHaveBeenCalledWith(
			payment.studentId,
			normalizedPaymentPeriod,
		);
		expect(paymentRepository.create).not.toHaveBeenCalled();
	});
});
