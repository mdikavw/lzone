import { describe, it, expect } from 'vitest';
import { createStudent } from '@/lib/domain/student';

describe('Student', () => {
	it('creates an active student with valid data', () => {
		const student = createStudent({
			name: 'Mahardika',
			phone: '081234567890',
		});

		expect(student.id).toBeDefined();
		expect(student.name).toBe('Mahardika');
		expect(student.phone).toBe('081234567890');
		expect(student.status).toBe('ACTIVE');
		expect(student.createdAt).toBeInstanceOf(Date);
		expect(student.updatedAt).toBeInstanceOf(Date);
	});

	it('rejects an empty name', () => {
		expect(() => {
			createStudent({
				name: '',
				phone: '081234567890',
			});
		}).toThrow();
	});

	it('rejects a whitespace-only name', () => {
		expect(() => {
			createStudent({
				name: '   ',
				phone: '081234567890',
			});
		}).toThrow();
	});

	it('rejects an empty phone number', () => {
		expect(() => {
			createStudent({
				name: 'Mahardika',
				phone: '',
			});
		}).toThrow();
	});

	it('allows an optional email', () => {
		const student = createStudent({
			name: 'Mahardika',
			phone: '081234567890',
			email: 'mahardika@example.com',
		});

		expect(student.email).toBe('mahardika@example.com');
	});

	it('trims student data', () => {
		const student = createStudent({
			name: '   Mahardika   ',
			phone: '  081234567890  ',
		});
		expect(student.name).toBe('Mahardika');
		expect(student.phone).toBe('081234567890');
	});
});
