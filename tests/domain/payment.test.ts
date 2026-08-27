import { describe, expect, it } from 'vitest';
import { createPayment } from '@/lib/domain/payment';

describe('Payment', () => {
	it('creates a payment with valid data', () => {
		const payment = createPayment({
			studentId: 'student-123',
			amount: 100000,
			paymentPeriod: new Date('2026-08-01'),
		});

		expect(payment.id).toBeDefined();
		expect(payment.studentId).toBe('student-123');
		expect(payment.amount).toBe(100000);
		expect(payment.paymentPeriod).toEqual(new Date('2026-08-01'));
		expect(payment.paidAt).toBeInstanceOf(Date);
		expect(payment.createdAt).toBeInstanceOf(Date);
		expect(payment.updatedAt).toBeInstanceOf(Date);
	});

	it('rejects an empty studentId', () => {
		expect(() => {
			createPayment({
				studentId: '',
				amount: 100000,
				paymentPeriod: new Date('2026-08-01'),
			});
		}).toThrow();
	});

	it('rejects a whitespace-only studentId', () => {
		expect(() => {
			createPayment({
				studentId: '  ',
				amount: 100000,
				paymentPeriod: new Date('2026-08-01'),
			});
		}).toThrow();
	});

	it('trims studentId', () => {
		const payment = createPayment({
			studentId: ' student-123 ',
			amount: 100000,
			paymentPeriod: new Date('2026-08-01'),
		});
		expect(payment.studentId).toBe('student-123');
	});

	it('rejects a zero amount', () => {
		expect(() => {
			createPayment({
				studentId: 'student-123',
				amount: 0,
				paymentPeriod: new Date('2026-08-01'),
			});
		}).toThrow();
	});
	it('rejects a negative amount', () => {
		expect(() => {
			createPayment({
				studentId: 'student-123',
				amount: -100000,
				paymentPeriod: new Date('2026-08-01'),
			});
		}).toThrow();
	});
	it('normalizes payment period to the first day of the month', () => {
		const payment = createPayment({
			studentId: 'student-123',
			amount: 100000,
			paymentPeriod: new Date('2026-08-20'),
		});
		expect(payment.paymentPeriod).toEqual(new Date('2026-08-01'));
	});
	it('allows an optional description', () => {
		const payment = createPayment({
			studentId: 'student-123',
			amount: 150000,
			paymentPeriod: new Date('2026-08-01'),
			description: 'Pembayaran les bulan Agustus',
		});
		expect(payment.description).toBe('Pembayaran les bulan Agustus');
	});
	it('trims the description', () => {
		const payment = createPayment({
			studentId: 'student-123',
			amount: 150000,
			paymentPeriod: new Date('2026-08-01'),
			description: ' Pembayaran Agustus ',
		});
		expect(payment.description).toBe('Pembayaran Agustus');
	});
	it('converts an empty description to undefined', () => {
		const payment = createPayment({
			studentId: 'student-123',
			amount: 150000,
			paymentPeriod: new Date('2026-08-01'),
			description: ' ',
		});
		expect(payment.description).toBeUndefined();
	});
});
