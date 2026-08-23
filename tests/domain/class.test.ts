import { describe, expect, it } from 'vitest';
import { createClass } from '@/lib/domain/class';

describe('Class', () => {
	it('creates an active class with valid data', () => {
		const classEntity = createClass({
			name: 'English Beginner A',
		});
		expect(classEntity.id).toBeDefined();
		expect(classEntity.name).toBe('English Beginner A');
		expect(classEntity.status).toBe('ACTIVE');
		expect(classEntity.createdAt).toBeInstanceOf(Date);
		expect(classEntity.updatedAt).toBeInstanceOf(Date);
	});

	it('rejects an empty name', () => {
		expect(() => {
			createClass({
				name: '',
			});
		}).toThrow();
	});

	it('rejects a whitespace-only name', () => {
		expect(() => {
			createClass({
				name: ' ',
			});
		}).toThrow();
	});

	it('allows an optional description', () => {
		const classEntity = createClass({
			name: 'English Beginner A',
			description: 'Beginner English Class',
		});
		expect(classEntity.description).toBe('Beginner English Class');
	});

	it('trims text fields', () => {
		const classEntity = createClass({
			name: ' English Beginner A ',
			description: ' Beginner English Class ',
		});
		expect(classEntity.name).toBe('English Beginner A');
		expect(classEntity.description).toBe('Beginner English Class');
	});
});
