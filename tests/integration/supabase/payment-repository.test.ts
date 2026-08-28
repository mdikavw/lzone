/**
 * Integration tests for SupabasePaymentRepository.
 *
 * Scope, per instructions:
 * - Behavior-focused, not implementation-detail (no assertions on which
 *   Supabase query builder methods were called or in what order).
 * - Tests only the stated contract: findById, findByStudent,
 *   findByStudentAndPeriod, findByPeriod, create, update
 * - CORRECTED CONTRACT: findByStudent, findByStudentAndPeriod, and
 *   findByPeriod all return Payment[] (not Payment | null). An empty
 *   array means no match; multiple payments can be returned.
 * - No invented business rules (no uniqueness, auth, deletion, validation,
 *   payment status, overdue logic, amount restrictions, ordering,
 *   duplicate-id, or nonexistent-update behavior).
 *
 * Runs against the dedicated Supabase TEST project, not mocks.
 *
 * Payments have a foreign key to students, and students to classes, so
 * every test that touches a payment first creates a prerequisite class
 * and student directly through Supabase (never through
 * StudentRepository/ClassRepository, since those are not under test here).
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabasePaymentRepository } from '@/lib/infrastructure/supabase/payment-repository';
import type { Payment } from '@/lib/domain/payment';

// --- Test setup -------------------------------------------------------

const supabaseUrl = process.env.SUPABASE_TEST_URL!;
const supabaseKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY!;

let supabase: SupabaseClient;
let repository: SupabasePaymentRepository;

// Track ids created during a test so we can clean them up afterward
// without depending on any repository's own cleanup.
let createdPaymentIds: string[] = [];
let createdStudentIds: string[] = [];
let createdClassIds: string[] = [];

// Minimal prerequisite fixtures. Class/Student are not under test here,
// so these carry only the fields needed to satisfy the schema/FK.
interface ClassFixture {
	id: string;
	name: string;
	type: 'GROUP' | 'PRIVATE';
	status: 'ACTIVE' | 'INACTIVE';
}

interface StudentFixture {
	id: string;
	name: string;
	phone: string;
	classId: string;
	status: 'ACTIVE' | 'INACTIVE';
	billingType: 'MONTHLY' | 'PER_SESSION';
}

function buildClassFixture(
	overrides: Partial<ClassFixture> = {},
): ClassFixture {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		name: 'Prerequisite Class',
		type: 'GROUP',
		status: 'ACTIVE',
		...overrides,
	};
}

function buildStudentFixture(
	overrides: Partial<StudentFixture> = {},
): StudentFixture {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		name: 'Prerequisite Student',
		phone: '08123456789',
		classId: overrides.classId ?? crypto.randomUUID(),
		status: 'ACTIVE',
		billingType: 'MONTHLY',
		...overrides,
	};
}

function buildPayment(overrides: Partial<Payment> = {}): Payment {
	const now = new Date();
	return {
		id: overrides.id ?? crypto.randomUUID(),
		studentId: overrides.studentId ?? crypto.randomUUID(),
		amount: 100000,
		description: 'Test payment',
		paidAt: now,
		paymentPeriod: new Date('2026-08-01'),
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

async function insertClassRow(classFixture: ClassFixture) {
	const { error } = await supabase.from('classes').insert({
		id: classFixture.id,
		name: classFixture.name,
		type: classFixture.type,
		status: classFixture.status,
	});
	if (error) throw error;
	createdClassIds.push(classFixture.id);
}

async function insertStudentRow(studentFixture: StudentFixture) {
	const { error } = await supabase.from('students').insert({
		id: studentFixture.id,
		name: studentFixture.name,
		phone: studentFixture.phone,
		class_id: studentFixture.classId,
		status: studentFixture.status,
		billing_type: studentFixture.billingType,
	});
	if (error) throw error;
	createdStudentIds.push(studentFixture.id);
}

// Creates class + student prerequisites and returns the student id to
// attach payments to.
async function insertPrerequisiteStudent(): Promise<string> {
	const classFixture = buildClassFixture();
	await insertClassRow(classFixture);

	const studentFixture = buildStudentFixture({ classId: classFixture.id });
	await insertStudentRow(studentFixture);

	return studentFixture.id;
}

// Insert a payment row directly (bypassing the repository) so tests that
// are NOT about create() don't depend on create() being correct.
async function insertPaymentRow(payment: Payment) {
	const { error } = await supabase.from('payments').insert({
		id: payment.id,
		student_id: payment.studentId,
		amount: payment.amount,
		description: payment.description ?? null,
		paid_at: payment.paidAt.toISOString(),
		payment_period: payment.paymentPeriod.toISOString(),
		created_at: payment.createdAt.toISOString(),
		updated_at: payment.updatedAt.toISOString(),
	});
	if (error) throw error;
	createdPaymentIds.push(payment.id);
}

beforeEach(() => {
	supabase = createClient(supabaseUrl, supabaseKey);
	repository = new SupabasePaymentRepository(supabase);
	createdPaymentIds = [];
	createdStudentIds = [];
	createdClassIds = [];
});

afterEach(async () => {
	// Delete order matters because of the FK chain: payments -> students -> classes.
	if (createdPaymentIds.length > 0) {
		await supabase.from('payments').delete().in('id', createdPaymentIds);
	}
	if (createdStudentIds.length > 0) {
		await supabase.from('students').delete().in('id', createdStudentIds);
	}
	if (createdClassIds.length > 0) {
		await supabase.from('classes').delete().in('id', createdClassIds);
	}
});

// --- Essential tests ----------------------------------------------------
// These verify the stated contract directly.

describe('SupabasePaymentRepository — essential', () => {
	it('findById returns the matching payment when it exists', async () => {
		const studentId = await insertPrerequisiteStudent();
		const payment = buildPayment({ studentId });
		await insertPaymentRow(payment);

		const result = await repository.findById(payment.id);

		expect(result).not.toBeNull();
		expect(result).toMatchObject({
			id: payment.id,
			studentId: payment.studentId,
			amount: payment.amount,
			description: payment.description,
		});
	});

	it('findById returns null when the payment does not exist', async () => {
		const result = await repository.findById(crypto.randomUUID());
		expect(result).toBeNull();
	});

	it('findByStudent returns the payments belonging to the specified student', async () => {
		const studentId = await insertPrerequisiteStudent();
		const payment = buildPayment({ studentId });
		await insertPaymentRow(payment);

		const result = await repository.findByStudent(studentId);
		const ids = result.map((p) => p.id);

		expect(ids).toContain(payment.id);
	});

	it('findByStudent returns multiple payments when more than one exists for the student', async () => {
		const studentId = await insertPrerequisiteStudent();
		const first = buildPayment({
			studentId,
			paymentPeriod: new Date('2026-08-01'),
		});
		const second = buildPayment({
			studentId,
			paymentPeriod: new Date('2026-09-01'),
		});
		await insertPaymentRow(first);
		await insertPaymentRow(second);

		const result = await repository.findByStudent(studentId);
		const ids = result.map((p) => p.id);

		expect(ids).toContain(first.id);
		expect(ids).toContain(second.id);
	});

	it('findByStudent returns an empty array when the student has no payment', async () => {
		const studentId = await insertPrerequisiteStudent();

		const result = await repository.findByStudent(studentId);

		expect(result).toEqual([]);
	});

	it('findByStudentAndPeriod returns the matching payments for that student and period', async () => {
		const studentId = await insertPrerequisiteStudent();
		const period = new Date('2026-08-01');
		const payment = buildPayment({ studentId, paymentPeriod: period });
		await insertPaymentRow(payment);

		const result = await repository.findByStudentAndPeriod(
			studentId,
			period,
		);
		const ids = result.map((p) => p.id);

		expect(ids).toContain(payment.id);
	});

	it('findByStudentAndPeriod returns an empty array when the period does not match', async () => {
		const studentId = await insertPrerequisiteStudent();
		const payment = buildPayment({
			studentId,
			paymentPeriod: new Date('2026-08-01'),
		});
		await insertPaymentRow(payment);

		const result = await repository.findByStudentAndPeriod(
			studentId,
			new Date('2026-09-01'),
		);

		expect(result).toEqual([]);
	});

	it('findByPeriod returns the payments matching the specified period', async () => {
		const studentId = await insertPrerequisiteStudent();
		const period = new Date('2026-08-01');
		const payment = buildPayment({ studentId, paymentPeriod: period });
		await insertPaymentRow(payment);

		const result = await repository.findByPeriod(period);
		const ids = result.map((p) => p.id);

		expect(ids).toContain(payment.id);
	});

	it('findByPeriod returns payments from multiple students for the same period', async () => {
		const period = new Date('2026-08-01');

		const studentA = await insertPrerequisiteStudent();
		const studentB = await insertPrerequisiteStudent();
		const paymentA = buildPayment({
			studentId: studentA,
			paymentPeriod: period,
		});
		const paymentB = buildPayment({
			studentId: studentB,
			paymentPeriod: period,
		});
		await insertPaymentRow(paymentA);
		await insertPaymentRow(paymentB);

		const result = await repository.findByPeriod(period);
		const ids = result.map((p) => p.id);

		expect(ids).toContain(paymentA.id);
		expect(ids).toContain(paymentB.id);
	});

	it('findByPeriod returns an empty array when no payment exists for that period', async () => {
		const studentId = await insertPrerequisiteStudent();
		await insertPaymentRow(
			buildPayment({ studentId, paymentPeriod: new Date('2026-08-01') }),
		);

		const result = await repository.findByPeriod(new Date('2027-01-01'));

		expect(result).toEqual([]);
	});

	it('create persists the payment and returns it', async () => {
		const studentId = await insertPrerequisiteStudent();
		const payment = buildPayment({ studentId });
		createdPaymentIds.push(payment.id); // ensure cleanup even if create() fails partially

		const result = await repository.create(payment);

		expect(result).toMatchObject({
			id: payment.id,
			studentId: payment.studentId,
			amount: payment.amount,
			description: payment.description,
		});

		// Verify persistence by fetching independently, not by trusting the return value.
		const fetched = await repository.findById(payment.id);
		expect(fetched).toMatchObject({
			id: payment.id,
			studentId: payment.studentId,
			amount: payment.amount,
		});
	});

	it('update persists changes to the identified payment and returns the result', async () => {
		const studentId = await insertPrerequisiteStudent();
		const original = buildPayment({
			studentId,
			amount: 100000,
			description: 'Before update',
		});
		await insertPaymentRow(original);

		const updated: Payment = {
			...original,
			amount: 150000,
			description: 'After update',
			paidAt: new Date('2026-08-05'),
			updatedAt: new Date(),
		};

		const result = await repository.update(updated);

		expect(result).toMatchObject({
			id: original.id,
			amount: 150000,
			description: 'After update',
		});

		const fetched = await repository.findById(original.id);
		expect(fetched).toMatchObject({
			id: original.id,
			amount: 150000,
			description: 'After update',
		});
	});
});

// --- Optional tests -------------------------------------------------------
// Mapping fidelity and edge cases, consistent with the Student/Class tests.

describe('SupabasePaymentRepository — optional', () => {
	it('maps snake_case columns to camelCase domain fields correctly', async () => {
		const studentId = await insertPrerequisiteStudent();
		const payment = buildPayment({ studentId });
		await insertPaymentRow(payment);

		const [result] = await repository.findByStudent(studentId);

		expect(result?.studentId).toBe(studentId);
		expect(result?.paidAt).toBeInstanceOf(Date);
		expect(result?.paymentPeriod).toBeInstanceOf(Date);
		expect(result?.createdAt).toBeInstanceOf(Date);
		expect(result?.updatedAt).toBeInstanceOf(Date);
	});

	it('round-trips a payment with no description (nullable field)', async () => {
		const studentId = await insertPrerequisiteStudent();
		const payment = buildPayment({ studentId, description: undefined });
		await insertPaymentRow(payment);

		const result = await repository.findById(payment.id);

		expect(result?.description == null).toBe(true);
	});

	it('distinguishes payments in different payment periods for the same student', async () => {
		const studentId = await insertPrerequisiteStudent();
		const augustPayment = buildPayment({
			studentId,
			paymentPeriod: new Date('2026-08-01'),
		});
		await insertPaymentRow(augustPayment);

		const augustResult = await repository.findByStudentAndPeriod(
			studentId,
			new Date('2026-08-01'),
		);
		const septemberResult = await repository.findByStudentAndPeriod(
			studentId,
			new Date('2026-09-01'),
		);

		expect(augustResult.map((p) => p.id)).toContain(augustPayment.id);
		expect(septemberResult).toEqual([]);
	});
});

// --- Ambiguities not covered by tests --------------------------------
//
// These are called out rather than resolved with invented assertions:
//
// 1. create(payment) with an id that already exists — duplicate/conflict
//    behavior is not specified.
// 2. update(payment) where payment.id does not match any existing row —
//    not specified whether this throws, returns null, or upserts.
// 3. Whether createdAt/updatedAt (and paidAt) are trusted from the input
//    Payment object or overwritten by the database (e.g. via a
//    trigger/default) is not specified. The requirements only say
//    "persist the supplied Payment," so this suite assumes the input
//    values are respected; if the DB actually generates these
//    server-side, the create/update tests above will need adjusting to
//    fetch and compare against DB-generated values instead.
// 4. Whether payment_period is stored/compared as a date-only value or a
//    full timestamp is left to "the actual generated schema" per the
//    task description. Tests use whole-date Date objects and compare via
//    findByStudentAndPeriod/findByPeriod round-trips; if the column is
//    date-only, timezone handling on the boundary may need verification
//    separately from what's covered here.
// 5. Ordering of the arrays returned by findByStudent(),
//    findByStudentAndPeriod(), and findByPeriod() is not specified, so no
//    test asserts on result order — only membership is checked.
